(function () {
  'use strict';

  /**
   * Mobile-ize the main databases
   */
  var build_main = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    sync = require('sync'),
    build = require('../../lib/xt/build');

  _.extend(build_main, task, /** @exports build_main */ {

    options: {
      pilot: {
        optional: '[boolean]',
        description: 'Additionally create a pilot area using a copy of the main database',
        value: true
      },
      edition: {
        optional: '[string]',
        description: 'The xTuple Edition to install',
        value: 'core'
      }
    },

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        extensions = build.editions[xt.edition],
        databases = _.where(xt.database.list, { main: true }),

        // build the main database and pilot, if specified
        results = _.map(databases, function (db) {
          var result = exec(build.getCoreBuildCommand(db, options));
          if (result.code) {
            throw new Error(result.stdout);
          }

          // install extensions specified in --xt-extensions, if any
          _.each(extensions, function (ext) {
            var result = exec(build.getExtensionBuildCommand(db, options, ext));
            if (result.code) {
              throw new Error(result.stdout);
            }
          });
          return result;
        });

      exec('sudo -u postgres psql -q -p {port} -c "alter user admin with password {adminpw}"'
        .format(_.extend({ }, options.xt, options.pg.cluster)));

      return results;
    }
  });
})();
