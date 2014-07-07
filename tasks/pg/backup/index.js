var lib = require('xtuple-server-lib'),
  config = require('xtuple-server-pg-config'),
  _ = require('lodash');

/**
 * Backup an existing database.
 */
_.extend(exports, lib.task, /** @exports xtuple-server-pg-backup */ {

  options: {
    dbname: {
      optional: '[dbname]',
      description: 'Name of database to operate on'
    }
  },

  /** @override */
  beforeTask: function (options) {
    config.discoverCluster(options);
  },

  /** @override */
  executeTask: function (options) {
    var backupFile = options.pg.backup.backupFile = lib.util.getSnapshotPath(options);
    var globalsFile = options.pg.backup.globalsFile = lib.util.getSnapshotPath(options, true);

    // dump globals
    lib.pgCli.dumpall(_.extend({ snapshotpath: globalsFile }, options));
    
    // dump data
    try {
      lib.pgCli.dump(_.extend({ snapshotpath: backupFile, dbname: options.pg.dbname }, options));
    }
    catch (e) {
      if (/File exists/.test(e.message)) {
        log.error('Please wait a minute before trying to create another backup.');
      }
      else {
        throw e;
      }
    }
  },

  /** @override */
  afterTask: function (options) {
    log.info('pg-backup dump', options.pg.backup.backupFile);
    log.info('pg-backup globals', options.pg.backup.globalsFile);
  }
});
