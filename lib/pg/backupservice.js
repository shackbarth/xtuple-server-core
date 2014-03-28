#!/usr/bin/env node

(function () {
  'use strict';

  /**
   * Schedule backups of the main postgres database.
   */
  var backupservice = exports;

  var task = require('../sys/task'),
    service = require('../sys/service'),
    pgctl = require('./ctl'),
    fs = require('fs'),
    moment = require('moment'),
    exec = require('execSync').exec,
    path = require('path'),
    program = require('commander'),
    _ = require('underscore');

  _.extend(backupservice, task, /** @exports backupservice */ {

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
      return exec('mkdir -p ' + backupservice.getBackupPath(options.xt.version, options.xt.name));
    },

    /** @override */
    run: function (options) {
      var path = options.pg.backupservice.path;


    },

    /**
     * Return the backup path as a string.
     * @public
     */
    getBackupPath: function (version, name) {
      return path.resolve('/var/lib/xtuple', version, name, 'snapshots');
    },

    /**
     * Create a snapshot of the specified cluster.
     * @param options.xtName
     * @param options.xtVersion
     * @public
     */
    createSnapshot: function (options) {
      var version = options.xtVersion,
        name = options.xtName,
        backup_path = backupservice.getBackupPath(version, name),
        list_query = "SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1')",
        xtconfig = fs.readFileSync(path.resolve('/etc/xtuple/', version, name, 'config.js')),
        live_databases = xtconfig.datasource.databases,
        all_databases = exec('psql -U postgres -t -c "' + list_query + ';"').stdout.join('\n'),
        file_template = '{name}_{database}_{ts}',
        file_formatter = {
          ts: moment().format('MMDDYYYY'),
          name: name,
        },
        globals_target = path.resolve(
          backup_path, file_template.format(_.extend({ database: 'globals' }, file_formatter))
        ),
        pg_dump = '/usr/lib/postgresql/9.3/bin/pg_dump',
        cmd_template = pg_dump + ' -U postgres -Fd -f {out}.dir.gz --no-synchronized-snapshots {database}';

      // backup globals (users, roles, etc)
      exec('pg_dumpall -U postgres -g | gzip -c9 {out}.sql.gz'.format({ out: globals_target }));

      // XXX to restore: pg_restore -Fd {out}.dir.gz {database} {out}.dir.gz
      // snapshot each database. possibly huge files, may take many minutes
      // e.g. kelhay 2.5G gzip pg_dump with -j4 takes 4min on my laptop. 8m with -j 1. -tjw
      return _.map(_.union(live_databases, all_databases), function (db) {
        return exec(cmd_template.format({
          database: db,
          out: path.resolve(
            backup_path,
            file_template.format(_.extend({ database: db }, file_formatter))
          )
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
          _.map(fs.readdirSync(backupservice.getBackupPath(version, name)), function (file) {
            return backupservice.parseFilename(file);
          }),
          'database'
        ),
        expired = _.flatten(_.map(db_groups, function (snapshots, name) {
          return _.first(_.sortBy(snapshots, 'ts'), (snapshots.length - maxlen));
        }));

      return _.map(expired, function (file) {
        fs.unlink(path.resolve(backupservice.getBackupPath(version, name), file.original));
        return file;
      });
    }
  });

  program
    .command('create-snapshot')
    .option('--xt-name <string>',     'Name of the cluster')
    .option('--xt-version <version>', 'xTuple version as listed in "service xtuple status"')
    .parse(process.argv)
    .action(backupservice.createSnapshot);

})();

