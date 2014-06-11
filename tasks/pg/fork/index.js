var lib = require('xtuple-server-lib'),
  config = require('xtuple-server-pg-config'),
  _ = require('lodash');

/**
 * Fork an existing database; sets arguments for the restore task.
 */
_.extend(exports, lib.task, /** @exports xtuple-server-pg-fork */ {

  options: {
    dbname: {
      required: '<dbname>',
      description: 'Name of database to operate on'
    }
  },

  /** @override */
  beforeTask: function (options) {
    config.discoverCluster(options);
  },

  /** @override */
  executeTask: function (options) {
    options.pg.infile = lib.util.getSnapshotPath(options);
    options.pg.dbname = lib.util.getForkName(options);
  }
});
