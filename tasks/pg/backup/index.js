var lib = require('xtuple-server-lib'),
  config = require('xtuple-server-pg-config'),
  fs = require('fs'),
  _ = require('lodash');

/**
 * Backup an existing database.
 */
_.extend(exports, lib.task, /** @exports xtuple-server-pg-backup */ {

  options: {
    dbname: {
      optional: '[dbname]',
      description: 'Name of database to backup',
      validate: function (value) {
        if (!value) {
          throw new Error('Please provide the name of the database to back up');
        }
        return value;
      }
    }
  },

  /** @override */
  beforeTask: function (options) {
    config.discoverCluster(options);
  },

  /**
   * @param options.pg.dbname
   *
   * @override
   */
  executeTask: function (options) {
    var backupMoment = options.pg.backup.backupMoment = new Date();
    var backupFile = options.pg.backup.backupFile = lib.util.getSnapshotPath(options, false, backupMoment);
    var globalsFile = options.pg.backup.globalsFile = lib.util.getSnapshotPath(options, true, backupMoment);

    if (fs.existsSync(backupFile) || fs.existsSync(globalsFile)) {
      throw new Error('Please wait a minute before trying to create another backup.');
    }

    // dump globals
    lib.pgCli.dumpall(_.extend({ snapshotpath: globalsFile }, options));
    
    // dump data
    lib.pgCli.dump(_.extend({ snapshotpath: backupFile, dbname: options.pg.dbname }, options));
  },

  /** @override */
  afterTask: function (options) {
    log.info('pg-backup dump', options.pg.backup.backupFile);
    log.info('pg-backup globals', options.pg.backup.globalsFile);
  }
});
