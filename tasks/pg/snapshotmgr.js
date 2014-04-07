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
    beforeTask: function (options) {
      var root = snapshotmgr.getSnapshotRoot(options.xt.version, options.xt.name);
      exec('mkdir -p ' + root);
      exec(('chown {xt.name}:xtuser '+ root).format(options));
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
     * Return the backup path as a string.
     * @public
     */
    getSnapshotRoot: function (version, name) {
      return path.resolve('/var/lib/xtuple', version, name, 'snapshots');
    },

    /**
     * Return path of a snapshot file
     * @param options - typical options object
     * @param options.dbname - name of dbname [globals]
     * @param options.daysago - day of backup to restore [0]
     * @public
     */
    getSnapshotPath: function (options) {
      options.dbname || (options.dbname = 'globals');
      return path.resolve(
        snapshotmgr.getSnapshotRoot(options.xt.version, options.xt.name),
        '{name}_{dbname}_{ts}.{ext}'.format({
          name: options.xt.name,
          dbname: options.dbname,
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
        backup_path = snapshotmgr.getSnapshotRoot(version, name),
        list_query = "SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1','{xt.name}')".format(options),
        all_databases = exec('sudo -u {xt.name} psql -U {xt.name} -t -p {port} -c "{query};"'.format(_.extend({
          query: list_query,
          port: options.pg.cluster.port
        }, options))).stdout.split('\n'),
        file_formatter = {
          ts: moment().format('MMDDYYYY'),
          name: name,
        },
        pg_dump = 'sudo -u {xt.name} /usr/lib/postgresql/9.3/bin/pg_dump',
        pg_dumpall = 'sudo -u {xt.name} /usr/lib/postgresql/9.3/bin/pg_dumpall',
        cmd_template = pg_dump + ' -U {xt.name} -w -p {port} -Fd -f {out} --no-synchronized-snapshots {dbname}',

        // backup globals (users, roles, etc) separately
        globals_snapshot = exec((pg_dumpall + ' -U {xt.name} -w -p {port} -g > {out}.sql').format(_.extend({
          port: options.pg.cluster.port,
          out: snapshotmgr.getSnapshotPath(options)
        }, options))),

        // snapshot each database. possibly huge files, may take many minutes
        // e.g. kelhay 2.5G gzip pg_dump with -j4 takes 4min on my laptop. 8m with -j 1. -tjw
        snapshot = _.map(_.compact(all_databases), function (_db) {
          var db = _db.trim(),
            snap = snapshotmgr.getSnapshotPath(_.extend({ dbname: db }, options));
          exec('rm -rf '+ snap);

          console.log(db);

          var cmd = cmd_template.format(_.defaults({
            port: options.pg.cluster.port,
            dbname: db,
            out: snap,
            jobs: Math.ceil(os.cpus().length / 2)
          }, options));
          console.log(cmd);
          return exec(cmd);
        }).concat([globals_snapshot]),
        errors = _.where(snapshot, { code: 1 });

      console.log(snapshot);

      if (errors.length > 0) {
        throw new Error(_.pluck(errors, 'stdout'));
      }

      return snapshot;
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
        pg_restore = '/usr/lib/postgresql/9.3/bin/pg_restore',
        queries = [
      
          // disconnect all users and lock database
          'select pg_terminate_backend(procpid) from pg_stat_activity',
          'revoke connect on database {dbname} from public'.format(options),

          // rename database
          ['rename', options.dbname, 'to', deprecated_db].join(' ')
        ];

      // initiate restore process... and wait. could take awhile
      pgcli.createdb({ owner: 'admin', dbname: options.dbname });
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
