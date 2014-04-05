(function () {
  'use strict';

  /**
   * Build test/demo databases
   */
  var build_common = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build');

  _.extend(build_common, task, /** @exports build_common */ {

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        databases = _.where(xt.database.list, { common: true });

      // build the common/demo databases
      return _.map(databases, function (db) {
        var result = exec(build.getCoreBuildCommand(db, options));
        if (result.code !== 0) {
          throw new Error(result.stdout);
        }

        return result;
      });
    }
  });
})();
