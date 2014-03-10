(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    build = require('./build');

  var build_common = exports;

  _.extend(build_common, /** @exports build_common */ {

    /** @static */
    run: function (options) {
      var xt = options.xt,
        databases = xt.database.list;

      // build the common/demo databases
      return _.map(databases, function (db) {
        return exec(build.getCoreBuildCommand(db, options)).stdout;
      });
    }
  });
})();
