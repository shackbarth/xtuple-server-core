(function () {
  'use strict';

  /**
   * Schedule backups of a postgres cluster.
   */
  var snapshotmgr = exports;

  var task = require('../../lib/task'),
    service = require('../sys/service'),
    scheduler = require('node-schedule'),
    pgcli = require('../../lib/pg-cli'),
    fs = require('fs'),
    os = require('os'),
    moment = require('moment'),
    exec = require('execSync').exec,
    path = require('path'),
    program = require('commander'),
    _ = require('underscore'),
    knex;

  _.extend(snapshotmgr, task, /** @exports snapshotmgr */ {

    options: {
      restore: {
        optional: '[boolean]',
        description: 'Restore the most recent backup',
        value: false
      },
      snapshott0: {
        optional: '[integer]',
        description: 'Hour of day at which to run the backup',
        value: 1
      },
      snapshotcount: {
        optional: '[integer]',
        description: 'The number of backup snapshots to retain',
        value: 7
      }
    },

    /** @override */
    beforeInstall: function (options) {
      options.pg.snapshotdir = path.resolve('/var/lib/xtuple', options.xt.version, options.xt.name, 'snapshots');
    },

    /** @override */
    beforeTask: function (options) {
      exec('mkdir -p ' + options.pg.snapshotdir);
      exec(('chown {xt.name}:xtuser '+ options.pg.snapshotdir).format(options));
      //exec('chmod u=rwx '+ root);

      //exec('chown postgres ' +  root);
    },

    /** @override */
    doTask: function (options) {
      var version = options.xt.version,
        name = options.xt.name,
        t0 = options.pg.snapshott0,
        schedule_display = 'Daily at '+ moment(t0, 'H').format('HH:mm'),
        out_path = path.resolve('/etc/xtuple/', version, name, 'pm2-backup-service.json'),
        conf_template = fs.readFileSync(
          path.resolve(__dirname, 'pm2-backup-service.json')).toString(),
        conf_formatter = _.extend({ }, options, {
          schedule: schedule_display
        });

      service.launch(conf_template.format(conf_formatter));
    },

    /**
     * Return path of a snapshot file
     * @param options - typical options object
     * @param options.daysago - day of backup to restore [0]
     * @param backupName - name of dbname [globals|all]
     * @public
     */
    getSnapshotPath: function (options, backupName) {
      return path.resolve(
        options.pg.snapshotdir,
        '{name}_{dbname}_{ts}.{ext}'.format({
          name: options.xt.name,
          dbname: backupName,
          ts: moment().subtract('days', options.daysago || 0).format('MMDDYYYY'),
          ext: options.dbname === 'globals' ? 'sql' : 'dir.gz'
        })
      );
    },

    /**
     * Create a snapshot of the specified cluster.
     * @param options.xt.name
     * @param options.xt.version
     * @public
     */
    createSnapshot: function (options) {
      var version = options.xt.version,
        name = options.xt.name,
        pg_dumpall = 'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/pg_dumpall',
        cmd_template = pg_dumpall + ' -U {xt.name} -w -p {port} -f {out} {dbname}',

        // backup globals (users, roles, etc) separately
        globals_snapshot = exec((pg_dumpall + ' -U {xt.name} -w -p {port} -g > {out}.sql').format(_.extend({
          port: options.pg.cluster.port,
          out: snapshotmgr.getSnapshotPath(options, 'globals')
        }, options))),

        all_snapshot = exec(cmd_template.format(_.defaults({
          port: options.pg.cluster.port,
          out: snapshotmgr.getSnapshotPath(options, 'all'),
          jobs: Math.ceil(os.cpus().length / 2)
        }, options)));

      if (globals_snapshot.code !== 0) {
        throw new Error(globals_snapshot.stdout);
      }
      if (all_snapshot.code !== 0) {
        throw new Error(all_snapshot.stdout);
      }

      return true;
    },

    /**
     * Restore a snapshot into a database.
     *
     * @public
     * @param options.pg.version
     * @param options.dbname
     * @param options.xt.name
     * @param options.snapshotmgr.include_globals [true]
     * @param options.daysago [0]
     */
    restoreSnapshot: function (options) {
      var globals_snapshot = snapshotmgr.getSnapshotPath(
          _.extend({ dbname: 'globals' }, options)
        ),
        db_snapshot = snapshotmgr.getSnapshotPath(options),
        deprecated_format = {
          dbname: options.dbname,
          version: options.xt.version.split('.').join(''),
          ts: moment().format('MMDDYYY')
        },
        deprecated_db = '{dbname}_{version}_{ts}'.format(deprecated_format),
        pg_restore = '/usr/lib/postgresql/{pg.version}/bin/pg_restore'.format(options),
        queries = [
      
          // disconnect all users and lock database
          'select pg_terminate_backend(procpid) from pg_stat_activity',
          'revoke connect on database {dbname} from public'.format(options),

          // rename database
          ['rename', options.dbname, 'to', deprecated_db].join(' ')
        ];

      // initiate restore process... and wait. could take awhile
      pgcli.createdb(options, 'admin', options.dbname);
      pgcli.restore(_.extend({
        filename: snapshotmgr.getSnapshotPath(options),
        dbname: options.dbname
      }, options));
    },

    /**
     * Return an object consisting of the backup filename components.
     * @public
     * @returns {
     *    name: STRING [kelhay],
     *    dbname: VERSION [1.8.1],
     *    ts: DATE [{Date}]
     * }
     */
    parseFilename: function (filename) {
      var base = path.basename(filename),
        tokens = base.split('_');

      return {
        original: filename,
        name: tokens[0],
        dbname: tokens[1],
        ts: moment(tokens[2], 'MMDDYYYY').valueOf()
      };
    },

    /**
     * Rotate local snapshots; This function will either delete old snapshots
     * or do nothing.
     *
     * @public
     */
    rotateSnapshot: function (options) {
      var maxlen = options.pg.snapshotcount,
        name = options.xt.name,
        version = options.xt.version,
        root = snapshotmgr.getSnapshotRoot(version, name),
        ls = fs.readdirSync(root),
        db_groups = _.groupBy(
          _.map(ls, function (file) {
            return snapshotmgr.parseFilename(file);
          }),
          'dbname'
        ),
        expired = _.flatten(_.map(db_groups, function (snapshots, name) {
          return _.first(_.sortBy(snapshots, 'ts'), (snapshots.length - maxlen));
        }));

      return _.map(expired, function (file) {
        fs.unlinkSync(path.resolve(root, file.original));
        return file;
      });
    }
  });

  /** @listens knex */
  process.on('knex', function (_knex) { knex = _knex; });

  program
    .command('start-service')
    .option('-t0 --snapshott0 [integer]', snapshotmgr.options.snapshott0.description)
    .option('--xt-name <string>',         'Name of the cluster')
    .option('--xt-version <version>',     'xTuple version')
    .parse(process.argv)
    .action(function (cmd) {
      var rule = new scheduler.RecurrenceRule(),
        options = {
          pg: {
            snapshott0: cmd.t0,
          },
          xt: {
            name: cmd.xtName,
            version: cmd.xtVersion
          }
        };

      // run once per day at the specified hour (t0)
      rule.hour = options.t0;

      scheduler.scheduleJob(rule, _.partial(snapshotmgr.createSnapshot, options));
    });

})();
