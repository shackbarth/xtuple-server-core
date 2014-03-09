(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    sync = require('sync'),
    build = require('./build');

  var build_main = exports;

  _.extend(build_main, /** @exports build_main */ {

    options: {
      pilot: {
        optional: '[boolean]',
        description: 'Additionally create a pilot area using a copy of the main database',
        value: true
      },
      extensions: {
        optional: '[csv]',
        description: 'Comma-delimited list of extensions to install',
        value: ''
      }
    },

    run: function (options) {
      var xt = options.xt,
        extensions = _.compact(xt.extensions.split(',')),
        databases = [ ];

      if (xt.maindb) {
        databases.push({ file: xt.maindb });
      }
      if (xt.maindb && xt.pilot) {
        databases.push({ file: xt.maindb, dbname: 'pilot' });
      }

      // build the main database and pilot, if specified
      return _.map(databases, function (db) {
        var result = exec(build.getBuildCommand(db));

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
    }
  });
})();
