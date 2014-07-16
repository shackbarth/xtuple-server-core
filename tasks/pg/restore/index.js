var lib = require('xtuple-server-lib'),
  config = require('xtuple-server-pg-config'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash');

/**
 * Restore a database from a file
 */
_.extend(exports, lib.task, /** @exports xtuple-server-pg-restore */ {

  options: {
    infile: {
      optional: '[infile]',
      description: 'Path to the file to be restored',
      validate: function (value, options) {
        var infile = !_.isEmpty(value) && path.resolve(value);

        if (!infile) {
          throw new Error('pg-infile must be set to the backup file you want to restore');
        }
        if (!fs.existsSync(path.resolve(value))) {
          throw new Error('pg-infile not found: '+ value);
        }
        if ((options.planName === 'import-users') && ('.sql' !== path.extname(options.pg.infile))) {
          throw new Error('The import-users plan can only import a raw ".sql" file');
        }

        return infile;
      }
    },
    dbname: {
      optional: '[dbname]',
      description: 'Name of database to restore'
    }
  },

  /** @override */
  beforeTask: function (options) {
    config.discoverCluster(options);
  },

  /** @override */
  executeTask: function (options) {
    if ('import-users' === options.planName) {
      lib.pgCli.psqlFile(options, options.pg.infile);
    }
    else {
      lib.pgCli.createdb(options, 'admin', options.pg.dbname);
      lib.pgCli.restore(_.extend({
        filename: options.pg.infile,
        dbname: options.pg.dbname
      }, options));

      // update config.js
      var configObject = require(options.xt.configfile);
      configObject.datasource.databases.push(options.pg.dbname);
      fs.writeFileSync(options.xt.configfile, lib.util.wrapModule(configObject));
    }
  },

  /** @override */
  afterTask: function (options) {
    log.info('pg-restore', 'restored', options.pg.dbname);
  }
});
