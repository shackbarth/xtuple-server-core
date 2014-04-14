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
      '03%20PostBooks-databases/{xt.version}/postbooks_{dbname}-{xt.version}.backup/download';

  _.extend(database, task, /** @exports database */ {

    options: {
      name: {
        required: '<name>',
        description: 'Name of the installation'
      },
      pilot: {
        optional: '[boolean]',
        description: 'Additionally create a pilot area using a copy of the main database',
        value: true
      },
      maindb: {
        optional: '[path]',
        description: 'Path to primary database .backup/.sql filename to use in production',
        value: null
      },
      edition: {
        optional: '[string]',
        description: 'The xTuple Edition to install',
        value: 'core'
      },
      demo: {
        optional: '[boolean]',
        description: 'Set to additionally install the demo databases',
        value: false
      },
      quickstart: {
        optional: '[boolean]',
        description: 'Set to additionally install the quickstart databases',
        value: false
      },
      adminpw: {
        optional: '[password]',
        description: 'Password for the database "admin" user for a new database'
      }
    },

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        downloads = _.compact([
          options.xt.demo && 'demo',
          options.xt.quickstart && 'quickstart'
        ]),
        // schedule postbooks demo database filenames for installation
        databases = _.map(downloads, function (dbname) {
          var wget_format = {
              dbname: 'xtuple_' + dbname,
              filename: path.resolve(options.xt.srcdir, dbname + '.backup'),
              url: url_template.format(_.extend({ dbname: dbname }, options)),
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
            dbname: 'main_' + xt.name,
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
            dbname: 'pilot_' + xt.name,
            main: true
          });
        }
      }

      if (databases.length === 0) {
        throw new Error('No databases have been found for installation');
      }

      options.xt.database.list = databases;
    }
  });
})();
