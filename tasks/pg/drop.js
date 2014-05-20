var lib = require('../../lib'),
  config = require('./config'),
  fs = require('fs'),
  exec = require('execSync').exec,
  _ = require('lodash');

/**
 * Drop an existing database.
 */
_.extend(exports, lib.task, /** @exports fork-database */ {

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
    lib.pgCli.dropdb(options, options.xt.name, options.pg.dbname);

    // update config.js
    var configObject = require(options.xt.configfile);
    _.pull(configObject.datasource.databases, options.pg.dbname);
    fs.writeFileSync(options.xt.configfile, lib.xt.build.wrapModule(configObject));
  }

});

