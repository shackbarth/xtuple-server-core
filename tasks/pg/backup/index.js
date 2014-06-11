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
  beforeInstall: function (options) {
    options.pg.dbname || (
      options.pg.dbname = options.xt.name + lib.util.getDatabaseNameSuffix(options)
    );
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
    lib.pgCli.dump(_.extend({
      snapshotpath: lib.util.getSnapshotPath(options),
      dbname: options.pg.dbname
    }, options));
  },

  /** @override */
  afterTask: function (options) {
    console.log('Database backed up to: ', options.pg.snapshotdir);
  }
});
