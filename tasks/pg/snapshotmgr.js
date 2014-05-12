(function () {
  'use strict';

  /**
   * Schedule backups of a postgres cluster.
   */
  var snapshotmgr = exports;

  var lib = require('../../lib'),
    service = require('../sys/service'),
    pgcli = require('../../lib/pg-cli'),
    fs = require('fs'),
    os = require('os'),
    moment = require('moment'),
    cron = require('cron-parser'),
    exec = require('execSync').exec,
    path = require('path'),
    program = require('commander'),
    _ = require('lodash');

  _.extend(snapshotmgr, lib.task, /** @exports snapshotmgr */ {

    options: {
      enablesnap: {
        optional: '[boolean]',
        description: 'Enable the snapshot manager',
        value: true
      },
      snapschedule: {
        optional: '[cron]',
        description: 'crontab entry for snapshot schedule [0 0 * * *] (daily)',
        value: '0 0 * * *'
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
    },

    /** @override */
    executeTask: function (options) {
      if ('install' === options.planName) {
        // validate cron entry
        cron.parseExpressionSync(options.pg.snapschedule);

        /*
        var pm2Template = fs.readFileSync(path.resolve(__dirname, 'pm2-backup-service.json')).toString(),
          coreServices = JSON.parse(fs.readFileSync(options.sys.pm2.configfile).toString()),
          combinedServices = coreServices.concat(JSON.parse(pm2Template.format(options)));

        fs.writeFileSync(options.sys.pm2.configfile, JSON.stringify(combinedServices, null, 2));
        */
      }
      else if ('backup' === options.planName) {
        snapshotmgr.createSnapshot(options);
      }
      else if ('restore' === options.planName) {
        snapshotmgr.restoreSnapshot(options);
      }
    },

    /**
     * Return path of a snapshot file
     * @param options - typical options object
     * @param options.date - date of snapshot (MMDDYYYY)
     * @param options.dbname - name of database
     * @public
     */
    getSnapshotPath: function (options) {
      var ts = moment(options.datetime, 'MMDDYYYY', true);
      if (!ts.isValid()) {
        throw new Error('options.date not valid: '+ options.date);
      }

      return path.resolve(
        options.pg.snapshotdir,
        '{name}_{dbname}_{ts}.{ext}'.format({
          name: options.xt.name,
          dbname: options.dbname,
          ts: options.date,
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
     * @param options.datetime
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
        deprecated_db = '{dbname}_{version}_{ts}'.format(deprecated_format);

      // disconnect all users and lock database
      pgcli.psql(options, 'select pg_terminate_backend(procpid) from pg_stat_activity');
      pgcli.psql(options, 'revoke connect on database {dbname} from public'.format(options));

      // rename database
      pgcli.psql(options, ['rename', options.dbname, 'to', deprecated_db].join(' '));

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

})();
