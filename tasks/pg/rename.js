var lib = require('../../lib'),
  config = require('./config'),
  _ = require('lodash');

/**
 * Rename an existing database.
 */
_.extend(exports, lib.task, /** @exports rename */ {

  options: {
    dbname: {
      required: '<dbname>',
      description: 'Name of database to operate on'
    },
    newname: {
      required: '<newname>',
      description: 'New name to assign to the database'
    }
  },

  /** @override */
  beforeTask: function (options) {
    config.discoverCluster(options);
  },

  /** @override */
  executeTask: function (options) {
    var res = lib.pgCli.psql(options,
      'alter database ' + options.pg.dbname + ' rename to ' + options.pg.newname
    );
    console.log(res);
  }
});
