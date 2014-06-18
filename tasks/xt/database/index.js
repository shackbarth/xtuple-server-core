var lib = require('xtuple-server-lib'),
  rimraf = require('rimraf'),
  _ = require('lodash'),
  exec = require('execSync').exec,
  path = require('path'),
  fs = require('fs');

/**
 * Build the specified xTuple database(s)
 */
_.extend(exports, lib.task, /** @exports xtuple-server-xt-database */ {

  options: {
    version: {
      optional: '[version]',
      description: 'xTuple Version',
      validate: function (value, options) {
        if (_.isEmpty(value)) {
          return require(path.resolve(options.local.workspace, 'package')).version;
        }
        if (_.isNumber(parseInt(value, 16))) {
          return value;
        }
        if (semver.valid(value)) {
          return value;
        }

        throw new TypeError('Specified version is not valid: '+ value);
      }
    },
    name: {
      optional: '[name]',
      description: 'Name of the installation',
      validate: function (value) {
        if (_.isEmpty(value)) {
          return process.env.SUDO_USER;
        }
        if (/\d/.test(value)) {
          throw new Error('xt.name cannot contain numbers');
        }
      }
    },
    maindb: {
      optional: '[path]',
      description: 'Path to primary database .backup/.sql filename to use in production',
      validate: function (value) {
        if (!_.isEmpty(value) && !fs.existsSync(path.resolve(value))) {
          throw new Error('Invalid path for xt.maindb: '+ value);
        }

        return value;
      }
    },
    edition: {
      optional: '[string]',
      description: 'The xTuple Edition to install',
      value: 'core'
    },
    demo: {
      optional: '[boolean]',
      description: 'Set to install the demo database',
      filename: 'postbooks_demo_data.sql',
      value: false
    },
    quickstart: {
      optional: '[boolean]',
      description: 'Set to install the quickstart database',
      filename: 'quickstart_data.sql',
      value: false
    },
    empty: {
      optional: '[boolean]',
      description: 'Set to install the empty database',
      filename: 'empty_data.sql',
      value: false
    },
    adminpw: {
      optional: '[password]',
      description: 'Password for the database "admin" user for a new database'
    }
  },

  /** @override */
  beforeInstall: function (options) {

    options.xt.database.list = _.compact(_.map([ 'demo', 'quickstart', 'empty' ], function (db) {
      return options.xt[db] ? {
        dbname: 'xtuple_' + db,
        filename: path.resolve(options.xt.usersrc, 'foundation-database', exports.options[db].filename),
        type: 's'
      } : null;
    }));

    // schedule main database file for installation
    if (!_.isEmpty(options.xt.maindb)) {
      options.xt.database.list.push({
        dbname: options.xt.name + lib.util.getDatabaseNameSuffix(options),
        filename: path.resolve(options.xt.maindb),
        type: 'b'
      });
    }

    if (options.xt.database.list.length === 0) {
      throw new Error('No databases have been found for installation');
    }
  },

  /** @override */
  beforeTask: function (options) {
    rimraf.sync(path.resolve(options.xt.usersrc, 'scripts/lib/build'));
  },

  /** @override */
  executeTask: function (options) {
    // build all specified databases
    _.each(options.xt.database.list, function (db) {

      var buildResult = exec(lib.util.getDatabaseBuildCommand(db, options));
      if (buildResult.code !== 0) {
        throw new Error(buildResult.stdout);
      }

      // install extensions specified by the edition
      exports.buildExtensions(lib.util.editions[options.xt.edition], db, options);
    });
  },

  buildExtensions: function (extensions, options) {
    _.each(extensions, function (ext) {
      var result = exec(lib.util.getExtensionBuildCommand(db, options, ext));
      if (result.code !== 0) {
        throw new Error(result.stdout);
      }
    });
  }
});
