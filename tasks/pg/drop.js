var lib = require('../../lib'),
  config = require('./config'),
  fs = require('fs'),
  exec = require('execSync').exec,
  _ = require('lodash');

/**
 * Drop an existing database.
 */
_.extend(exports, lib.task, /** @exports drop-database */ {

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
    var res = _.pull(configObject.datasource.databases, options.pg.dbname);

    console.log(JSON.stringify(configObject.datasource.databases, null, 2));
    console.log(res);

    fs.writeFileSync(options.xt.configfile, lib.xt.build.wrapModule(configObject));
  },

  /** @override */
  afterTask: function (options) {
    exec('service xtuple {xt.version} {xt.name} restart'.format(options));
  }
});

