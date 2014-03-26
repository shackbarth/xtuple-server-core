(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    url_template = 'http://sourceforge.net/projects/postbooks/files/' +
      '03%20PostBooks-databases/{version}/postbooks_{flavor}-{version}.backup/download',
    xtrole_template =
      'CREATE USER admin WITH PASSWORD \'{adminpw}\' CREATEDB CREATEUSER IN GROUP xtrole';

  var database = exports;

  _.extend(database, /** @exports database */ {

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
        databases = !xt.setupdemos ? [ ] : _.map(database.download, function (flavor) {
          var flavor_format = _.extend({ flavor: flavor }, download_format),
            wget_format = {
              flavor: flavor,
              file: path.resolve(options.xt.appdir, '..', flavor + '.backup'),
              url: url_template.format(flavor_format),
              common: true
            };
          
          if (!fs.existsSync(wget_format.file)) {
            exec('sudo -u xtuple wget -qO {file} {url}'.format(wget_format));
            exec('sudo -u xtuple chown xtuple {file}'.format(wget_format));
          }
          return wget_format;
        }),
        maindb_path = path.resolve(options.xt.maindb),
        asset_path = path.resolve(__dirname, '../../', 'assets'),
        xtrole_sql = xtrole_template.format(options.xt);

      // schedule asset files for installation
      if (options.xt.masterref) {
        databases.push({
          file: path.resolve(asset_path, database.masterref),
          flavor: 'masterref',
          common: true
        });
      }

      // schedule main database file for installation
      if (options.xt.maindb) {
        if (fs.existsSync(maindb_path)) {
          databases.push({
            file: maindb_path,
            flavor: xt.name,
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
            flavor: xt.name + 'pilot',
            main: true
          });
        }
      }

      if (databases.length === 0) {
        throw new Error('No databases have been found for installation');
      }

      // prime the databases
      exec('sudo -u postgres psql -q -p {port} -c "CREATE GROUP xtrole"'
        .format(options.pg.cluster));

      exec('sudo -u postgres psql -q -p {port} -c "{sql}"'
        .format(_.extend({ sql: xtrole_sql }, options.pg.cluster)));

      _.each(databases, function (db) {
        var create_template = _.extend(db, options.pg.cluster);

        exec('sudo -u postgres createdb -O admin -p {port} {flavor}'.format(create_template));
        exec('sudo -u postgres {flavor} psql -q -p {port} -c "CREATE EXTENSION plv8"'
          .format(create_template));
      });

      return {
        list: databases
      };
    }
  });
})();
