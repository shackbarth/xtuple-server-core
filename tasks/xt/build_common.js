(function () {
  'use strict';

  /**
   * Build test/demo databases
   */
  var build_common = exports;

  var task = require('../../lib/task'),
    pgcli = require('../../lib/pg-cli'),
    rimraf = require('rimraf'),
    fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build');

  _.extend(build_common, task, /** @exports build_common */ {

    /** @override */
    doTask: function (options) {
      var databases = _.where(options.xt.database.list, { common: true });

      // build the common/demo databases
      _.each(databases, function (db) {
        build.trapRestoreErrors(pgcli.restore(_.extend(db, options)));
        rimraf.sync(path.resolve(options.xt.coredir, 'scripts/lib/build'));

        var buildResult = exec(build.getCoreBuildCommand(db, options));
        if (buildResult.code !== 0) {
          throw new Error(buildResult.stdout);
        }
      });
    }
  });
})();
