(function () {
  'use strict';

  /**
   * Schedule backups of a postgres cluster.
   */
  var snapshotmgr = exports;

  var lib = require('../../lib'),
    fs = require('fs'),
    os = require('os'),
    moment = require('moment'),
    cron = require('cron-parser'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('lodash');

  _.extend(snapshotmgr, lib.task, /** @exports snapshotmgr */ {

    options: {
      enablesnap: {
        optional: '[boolean]',
        description: 'Enable the snapshot manager',
        value: false
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
      },
      backupfile: {
        optional: '[backupfile]',
        description: 'Path to the postgres backup'
      },
      targetdb: {
        optional: '[targetdb]',
        description: 'Name of database to operate on'
      }
    },

    /** @override */
    beforeInstall: function (options) {
      options.pg.snapshotdir = path.resolve('/var/lib/xtuple', options.xt.version, options.xt.name, 'snapshots');
      options.pg.pm2 = {
        configfile: path.resolve(options.sys.servicedir, 'pm2-backup-services.json'),
        templatefile: path.resolve(__dirname, 'pm2-backup-service.json')
      };
      options.pg.pm2.template = fs.readFileSync(options.pg.pm2.templatefile).toString();
    },

    /** @override */
    beforeTask: function (options) {
      exec('mkdir -p ' + options.pg.snapshotdir);
      exec(('chown {xt.name}:xtuser '+ options.pg.snapshotdir).format(options));
      fs.writeFileSync(options.sys.pg.configfile, options.pg.pm2.template.format(options));
    },

    /** @override */
    executeTask: function (options) {
      // validate cron entry
      cron.parseExpressionSync(options.pg.snapschedule);

      if (options.pg.enablesnap) {
        exec('pm2 ping');
        var start = exec('sudo HOME={xt.homedir} pm2 start -u {xt.name} {pg.pm2.configfile}'
          .format(options));

        if (start.code !== 0) {
          throw new Error(JSON.stringify(start));
        }
      }

      if (options.planName !== 'install') {
        snapshotmgr[options.planName.camelize()](options);
      }
    },

    /** @override */
    afterTask: function (options) {
      exec('HOME=~{xt.name} sudo -u {xt.name} service xtuple {xt.version} {xt.name} restart'.format(options));
    },

    backupDatabase: function (options) {
      snapshotmgr.createSnapshot(options);
    },

    restoreDatabase: function (options) {
      lib.pgCli.restore(_.extend({
        filename: path.resolve(options.pg.backupfile),
        dbname: options.pg.targetdb
      }, options));

      // update config.js
      var configObject = require(options.xt.configfile);
      configObject.datasource.databases.push(options.pg.targetdb);
      fs.writeFileSync(options.xt.configfile, lib.xt.build.wrapModule(configObject));
    },

    forkDatabase: function (options) {
      snapshotmgr.backupDatabase(options);
      snapshotmgr.restoreDatabase(_.extend({
        targetdb: options.pg.targetdb + '_fork_' + moment().format('MMDD')
      }, options));
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
      lib.pgCli.pg_dumpall({
        snapshotpath: snapshotmgr.getSnapshotPath(options, 'globals')
      }, options);
      lib.pgCli.pg_dump({
        snapshotpath: snapshotmgr.getSnapshotPath(options, 'maindb'),
        dbname: options.xt.name + '_main'
      }, options);
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
      lib.pgCli.psql(options, 'select pg_terminate_backend(procpid) from pg_stat_activity');
      lib.pgCli.psql(options, 'revoke connect on database {dbname} from public'.format(options));

      // rename database
      lib.pgCli.psql(options, ['rename', options.dbname, 'to', deprecated_db].join(' '));

      // initiate restore process... and wait. could take awhile
      lib.pgCli.createdb(options, 'admin', options.dbname);
      lib.pgCli.restore(_.extend({
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
