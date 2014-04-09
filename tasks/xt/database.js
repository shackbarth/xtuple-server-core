(function () {
  'use strict';

  /**
   * Aggregate info about the databases the installer has been directed to set
   * up.
   */
  var database = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    build = require('../../lib/xt/build'),
    fs = require('fs'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    pgcli = require('../../lib/pg-cli'),
    url_template = 'http://sourceforge.net/projects/postbooks/files/' +
      '03%20PostBooks-databases/{version}/postbooks_{dbname}-{version}.backup/download';

  _.extend(database, task, /** @exports database */ {

    options: {
      name: {
        required: '<name>',
        description: 'Name of the installation'
      },
      maindb: {
        optional: '[path]',
        description: 'Path to primary database .backup filename to use in production',
        value: null
      },
      setupdemos: {
        optional: '[boolean]',
        description: 'Set to additionally install the demo databases',
        value: true
      },
      adminpw: {
        optional: '[password]',
        description: 'Password for the database "admin" user for a new database',
        value: 'admin'
      }
    },

    versions: {
      '1.8.0': '4.3.0',
      '1.8.1': '4.3.0',
      '1.8.2': '4.4.0',
      '4.4.0': '4.4.0'
    },
    download: [ 'quickstart' ],

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        download_format = {
          version: database.versions[xt.version] || xt.version
        },
        // schedule postbooks demo database filenames for installation
        databases = !xt.setupdemos ? [ ] : _.map(database.download, function (dbname) {
          var dbname_format = _.extend({ dbname: dbname }, download_format),
            wget_format = {
              dbname: dbname,
              filename: path.resolve(options.xt.srcdir, dbname + '.backup'),
              url: url_template.format(dbname_format),
              common: true
            },
            wget_result;
          
          if (fs.existsSync(wget_format.filename)) {
            return wget_format;
          }

          wget_result = exec('wget -qO {filename} {url}'.format(wget_format));
          if (wget_result.code !== 0) {
            throw new Error(wget_result.stdout);
          }

          exec('chown :xtuser {filename}'.format(wget_format));

          return wget_format;
        }),
        maindb_path;

      // schedule main database filename for installation
      if (_.isString(options.xt.maindb)) {
        maindb_path = path.resolve(options.xt.maindb);
        if (fs.existsSync(maindb_path)) {
          databases.push({
            filename: maindb_path,
            dbname: xt.name + '-main',
            main: true
          });
        }
        else {
          throw new Error('Database File not found; expected to find '+ maindb_path);
        }

        // schedule pilot for installation
        if (xt.maindb && xt.pilot) {
          databases.push({
            filename: maindb_path,
            dbname: xt.name + '-pilot',
            main: true
          });
        }
      }

      if (databases.length === 0) {
        throw new Error('No databases have been found for installation');
      }

      options.xt.database.list = _.map(databases, function (db) {
        var psql_template = _.extend({ owner: 'admin' }, db, options),
          // create database
          createdb = pgcli.createdb(psql_template),

          // enable plv8 extension
          plv8 = pgcli.psql(psql_template, 'CREATE EXTENSION plv8');

        if (createdb.code !== 0) {
          throw new Error('Database creation failed: '+ createdb.stdout);
        }
        if (plv8.code !== 0) {
          throw new Error('PLV8 installation failed: '+ plv8.stdout);
        }

        return db;
      });
    }
  });
})();
