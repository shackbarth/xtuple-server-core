#!/usr/bin/env node

(function () {
  'use strict';

  /**
   * Schedule backups of a postgres cluster.
   */
  var snapshotmgr = exports;

  var task = require('../sys/task'),
    service = require('../sys/service'),
    scheduler = require('node-schedule'),
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
    prelude: function (options) {
      var root = snapshotmgr.getSnapshotRoot(options.xt.version, options.xt.name);
      exec('mkdir -p ' + root);
      exec('chown postgres /var/lib/postgresql');
      exec('chmod u=rwx '+ root);

      exec('chown postgres ' +  root);
    },

    /** @override */
    run: function (options) {
      var version = options.xt.version,
        name = options.xt.name,
        t0 = options.pg.snapshott0,
        schedule_display = 'Daily at '+ moment(t0, 'H').format('HH:mm'),
        out_path = path.resolve('/etc/xtuple/', version, name, 'pm2-backup-service.json'),
        conf_template = fs.readFileSync(path.resolve(__dirname, 'pm2-backup-service.json')),
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
     * @param options.database - name of database [globals]
     * @param options.daysago - day of backup to restore [0]
     * @public
     */
    getSnapshotPath: function (options) {
      return path.resolve(
        snapshotmgr.getSnapshotRoot(options.xt.version, options.xt.name),
        '{name}_{database}_{ts}.{ext}'.format({
          name: options.xt.name,
          database: options.database || 'globals',
          ts: moment().subtract('days', options.daysago || 0).format('MMDDYYYY'),
          ext: options.database ? 'sql' : 'dir.gz'
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
        list_query = "SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1')",
        all_databases = exec('sudo -u postgres psql -U postgres -t -p {port} -c "{query};"'.format({
          query: list_query,
          port: options.pg.cluster.port
        })).stdout.split('\n'),
        file_formatter = {
          ts: moment().format('MMDDYYYY'),
          name: name,
        },
        pg_dump = 'sudo -u postgres /usr/lib/postgresql/9.3/bin/pg_dump',
        cmd_template = pg_dump + ' -U postgres -w -p {port} -Fd -f {out} --no-synchronized-snapshots {database}';

      // backup globals (users, roles, etc) separately
      var globals_snapshot = exec('sudo -u postgres pg_dumpall -U postgres -w -p {port} -g > {out}.sql'.format({
        port: options.pg.cluster.port,
        out: snapshotmgr.getSnapshotPath(options)
      }));

      // snapshot each database. possibly huge files, may take many minutes
      // e.g. kelhay 2.5G gzip pg_dump with -j4 takes 4min on my laptop. 8m with -j 1. -tjw
      return _.map(_.compact(all_databases), function (_db) {
        var db = _db.trim();
        return exec(cmd_template.format({
          port: options.pg.cluster.port,
          database: db,
          out: snapshotmgr.getSnapshotPath(_.extend({ database: db }, options)),
          jobs: Math.ceil(os.cpus().length / 2)
        }));
      }).concat([globals_snapshot]);
    },

    /**
     * Restore a snapshot into a database.
     *
     * @public
     * @param options.pg.version
     * @param options.pg.database
     * @param options.xt.name
     * @param options.snapshotmgr.include_globals [true]
     * @param options.daysago [0]
     */
    restoreSnapshot: function (options) {
      var globals_snapshot = snapshotmgr.getSnapshotPath(
          _.extend({ database: 'globals' }, options)
        ),
        db_snapshot = snapshotmgr.getSnapshotPath(options),
        deprecated_format = {
          database: options.database,
          version: options.xt.version.split('.').join(''),
          ts: moment().format('MMDDYYY')
        },
        deprecated_db = '{database}_{version}_{ts}'.format(deprecated_format),
        pg_restore = '/usr/lib/postgresql/9.3/bin/pg_restore';
      
      // disconnect all users
      (function () {
        return knex('pg_stat_activity')
          .select(knex.raw('pg_terminate_backend(procpid)'))
          .where({ datname: options.database });
      })()
      // disable connections
      .then(function () {
        return knex.raw('revoke connect on database {database} from public'.format(options));
      })
      // rename database
      .then(function () {
        return knex.raw(['rename', options.database, 'to', deprecated_db].join(' '));
      })
      // initiate restore process... and wait.
      .then(function () {
        exec('createdb -O admin '+ options.database);
        exec(pg_restore + ' -j {jobs} -Fd {in} {database}'.format({
          'in': db_snapshot,
          jobs: Math.max(1, os.cpus().length - 1)
        }));
      });
    },

    /**
     * Return an object consisting of the backup filename components.
     * @public
     * @returns {
     *    name: STRING [kelhay],
     *    database: VERSION [1.8.1],
     *    ts: DATE [{Date}]
     * }
     */
    parseFilename: function (filename) {
      var base = path.basename(filename),
        tokens = base.split('_');

      return {
        original: filename,
        name: tokens[0],
        database: tokens[1],
        ts: moment(tokens[2], 'MMDDYYYY').valueOf()
      };
    },

    /**
     * Rotate or delete local snapshots.
     * @public
     */
    rotateSnapshot: function (options) {
      var maxlen = options.pg.snapshotcount,
        name = options.xt.name,
        version = options.xt.version,
        db_groups = _.groupBy(
          _.map(fs.readdirSync(snapshotmgr.getSnapshotRoot(version, name)), function (file) {
            return snapshotmgr.parseFilename(file);
          }),
          'database'
        ),
        expired = _.flatten(_.map(db_groups, function (snapshots, name) {
          return _.first(_.sortBy(snapshots, 'ts'), (snapshots.length - maxlen));
        }));

      return _.map(expired, function (file) {
        fs.unlink(path.resolve(snapshotmgr.getSnapshotRoot(version, name), file.original));
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

