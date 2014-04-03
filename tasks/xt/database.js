(function () {
  'use strict';

  /**
   * Aggregate info about the databases the installer has been directed to set
   * up.
   */
  var database = exports;

  var format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    pgcli = require('../../lib/pg-cli'),
    url_template = 'http://sourceforge.net/projects/postbooks/files/' +
      '03%20PostBooks-databases/{version}/postbooks_{dbname}-{version}.backup/download';

  _.extend(database, /** @exports database */ {

    /**
     * Map edition -> extension[]. These lists of extensions are in addition
     * to the 'core' extensions already installed by default.
     */
    editions: {
      core: [ ],
      manufacturing: [
        'inventory',
        'manufacturing'
      ],
      distribution: [
        'inventory',
        'distribution'
      ],
      enterprise: [
        'inventory',
        'distribution',
        'manufacturing'
      ]
    },

    options: {
      name: {
        required: '<name>',
        description: 'Name of the installation'
      },
      version: {
        required: '<version>',
        description: 'xTuple Mobile App Version',
        value: '1.8.1'
      },
      maindb: {
        optional: '[path]',
        description: 'Path to primary database .backup file to use in production',
        value: ''
      },
      setupdemos: {
        optional: '[boolean]',
        description: 'Set to additionally install the demo databases',
        value: true
      },
      masterref: {
        optional: '[boolean]',
        description: '@deprecated. Set this flag to install masterref from assets/',
        value: false
      },
      adminpw: {
        required: '<password>',
        description: 'Password for the database "admin" user'
      }
    },

    // XXX silliness. remove after 4.4
    versions: {
      '1.8.0': '4.3.0',
      '1.8.1': '4.3.0',
      '1.8.2': '4.3.0',
      '1.8.3': '4.3.0',
      '1.8.4': '4.3.0',
      '1.8.5': '4.3.0',
      '1.8.6': '4.3.0',
      '1.8.7': '4.3.0',
      '1.8.8': '4.3.0',
      '1.8.9': '4.3.0'
    },
    download: [ 'quickstart', 'demo' ],
    masterref: 'masterref-4.3.0.backup',

    /** @static */
    run: function (options) {
      var xt = options.xt,
        download_format = {
          version: database.versions[xt.version]
        },
        // schedule postbooks demo database files for installation
        databases = !xt.setupdemos ? [ ] : _.map(database.download, function (dbname) {
          var dbname_format = _.extend({ dbname: dbname }, download_format),
            wget_format = {
              dbname: dbname,
              file: path.resolve(options.xt.appdir, '..', dbname + '.backup'),
              url: url_template.format(dbname_format),
              common: true
            };
          
          if (!fs.existsSync(wget_format.file)) {
            exec('sudo wget -qO {file} {url}'.format(wget_format));
            exec('sudo chown xtuple {file}'.format(wget_format));
          }
          return wget_format;
        }),
        maindb_path = path.resolve(options.xt.maindb),
        asset_path = path.resolve(__dirname, '../../', 'assets');

      // schedule asset files for installation
      if (options.xt.masterref) {
        databases.push({
          file: path.resolve(asset_path, database.masterref),
          dbname: 'masterref',
          common: true
        });
      }

      // schedule main database file for installation
      if (options.xt.maindb) {
        if (fs.existsSync(maindb_path)) {
          databases.push({
            file: maindb_path,
            dbname: xt.name,
            main: true
          });
        }
        else {
          throw new Error('Database File not found; expected to find '+ maindb_path);
        }

        // schedule pilot for installation
        if (xt.maindb && xt.pilot) {
          databases.push({
            file: maindb_path,
            dbname: xt.name + 'pilot',
            main: true
          });
        }
      }

      if (databases.length === 0) {
        throw new Error('No databases have been found for installation');
      }

      return {
        list: _.map(databases, function (db) {
          var psql_template = _.extend({ owner: 'admin' }, db, options),
            // create database
            createdb = pgcli.createdb(psql_template),

            // enable plv8 extension
            plv8 = pgcli.psql(psql_template, 'CREATE EXTENSION plv8');

          if (createdb.code !== 0) {
            throw new Error('Database creation failed: '+ JSON.stringify(createdb, null, 2));
          }
          if (plv8.code !== 0) {
            throw new Error('PLV8 installation failed: '+ JSON.stringify(plv8, null, 2));
          }

          return db;
        })
      };
    }
  });

})();
