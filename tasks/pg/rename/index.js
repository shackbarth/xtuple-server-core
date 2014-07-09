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
    var res = lib.pgCli.psql(options, [

      'select pg_terminate_backend(pg_stat_activity.pid)',
      'from pg_stat_activity where pg_stat_activity.datname = \'' + options.pg.dbname + '\'',
      'and pid <> pg_backend_pid();',

      'alter database \"' + options.pg.dbname + '\" rename to ' + options.pg.newname

    ].join(' '));
    log.verbose('pg-rename', res);

    var configObject = require(options.xt.configfile);
    res = _.pull(configObject.datasource.databases, options.pg.dbname);
    configObject.datasource.databases.push(options.pg.newname);

    fs.writeFileSync(options.xt.configfile, lib.util.wrapModule(configObject));
  },

  /** @override */
  afterTask: function (options) {
    log.info('pg-rename', 'Restart the xTuple server for changes to take effect');
  }
});
