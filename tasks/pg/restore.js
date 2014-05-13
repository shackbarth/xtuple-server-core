var lib = require('../../lib'),
  fs = require('fs'),
  config = require('./config'),
  mgr = require('./snapshotmgr'),
  exec = require('execSync').exec,
  path = require('path'),
  _ = require('lodash');

/**
 * Restore a database from a file
 */
_.extend(exports, lib.task, /** @exports restore-database */ {

  options: {
    infile: {
      required: '<infile>',
      description: 'Path to the file to be restored'
    },
    dbname: {
      required: '<dbname>',
      description: 'Name of database to operate on'
    }
  },

  /** @override */
  beforeInstall: function (options) {
    options.pg.infile = path.resolve(options.pg.infile);
  },

  /** @override */
  beforeTask: function (options) {
    config.discoverCluster(options);
  },

  /** @override */
  executeTask: function (options) {
    if ('import-users' === options.planName && /\.sql$/.test(options.pg.infile)) {
      lib.pgCli.psqlFile(options, options.pg.infile);
    }
    else {
      lib.pgCli.createdb(options, 'admin', options.pg.dbname);
      lib.pgCli.restore(_.extend({
        filename: path.resolve(options.pg.infile),
        dbname: options.pg.dbname
      }, options));
    }

    // update config.js
    var configObject = require(options.xt.configfile);
    configObject.datasource.databases.push(options.pg.dbname);
    fs.writeFileSync(options.xt.configfile, lib.xt.build.wrapModule(configObject));
  },

  /** @override */
  afterTask: function (options) {
    exec('HOME=~{xt.name} sudo -u {xt.name} service xtuple {xt.version} {xt.name} restart'.format(options));
  }
});
