var lib = require('../../lib'),
  config = require('./config'),
  exec = require('execSync').exec,
  fs = require('fs'),
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
    'select pg_terminate_backend(pg_stat_activity.pid) from pg_stat_activity where pg_stat_activity.datname = \'' + options.pg.dbname + '\' and pid <> pg_backend_pid(); alter database \"' + options.pg.dbname + '\" rename to ' + options.pg.newname
    );
    console.log(res);

    var configObject = require(options.xt.configfile);
    res = _.pull(configObject.datasource.databases, options.pg.dbname);
    configObject.datasource.databases.push(options.pg.newname);

    console.log(JSON.stringify(configObject.datasource.databases, null, 2));
    console.log(res);

    fs.writeFileSync(options.xt.configfile, lib.xt.build.wrapModule(configObject));
  },

  /** @override */
  afterTask: function (options) {
    exec('service xtuple {xt.version} {xt.name} restart'.format(options));
  }
});
