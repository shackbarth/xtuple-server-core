var lib = require('xtuple-server-lib'),
  config = require('xtuple-server-pg-config'),
  _ = require('lodash'),
  fs = require('fs');

/**
 * Rename an existing database.
 */
_.extend(exports, lib.task, /** @exports xtuple-server-pg-rename */ {

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

    var configObject = require(options.xt.configfile);
    res = _.pull(configObject.datasource.databases, options.pg.dbname);
    configObject.datasource.databases.push(options.pg.newname);

    console.log(JSON.stringify(configObject.datasource.databases, null, 2));
    console.log(res);

    fs.writeFileSync(options.xt.configfile, lib.xt.build.wrapModule(configObject));
  },

  /** @override */
  afterTask: function (options) {
    console.log('Restart the xTuple server for changes to take effect');
  }
});
