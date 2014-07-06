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
    // dump globals
    lib.pgCli.dumpall(_.extend({ snapshotpath: lib.util.getSnapshotPath(options, true) }, options));
    
    // dump data
    try {
      lib.pgCli.dump(_.extend({
        snapshotpath: lib.util.getSnapshotPath(options),
        dbname: options.pg.dbname
      }, options));
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
    log.info('Database backed up to', lib.util.getSnapshotPath(options));
  }
});
