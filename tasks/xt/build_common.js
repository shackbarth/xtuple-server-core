(function () {
  'use strict';

  /**
   * Build test/demo databases
   */
  var build_common = exports;

  var task = require('../../lib/task'),
    xtPhase = require('./index'),
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
    beforeInstall: function (options) {
      options.xt.buildconfigfile = path.resolve(options.xt.configdir, 'build/config.js');

      exec('mkdir -p ' + path.resolve(options.xt.configdir, 'build'));
    },

    /** @override */
    beforeTask: function (options) {
      var buildOptions = _.clone(options);

      buildOptions.xt = _.extend({ }, options.xt, {
        name: 'admin',
        configfile: options.xt.buildconfigfile
      });
      buildOptions.xt.serverconfig = { };

      require('./serverconfig').doTask(buildOptions);

      // we need to be able to write files in the src directory temporarily
      exec('chmod -R g+w,u+w {xt.srcdir}'.format(options));
    },

    /** @override */
    doTask: function (options) {
      var databases = _.where(options.xt.database.list, { common: true });

      // build the common/demo databases
      _.each(databases, function (db) {
        rimraf.sync(path.resolve(options.xt.coredir, 'scripts/lib/build'));

        var buildResult = exec(build.getCoreBuildCommand(db, options));
        console.log(buildResult);
        if (buildResult.code !== 0) {
          throw new Error(buildResult.stdout);
        }
      });
    },

    afterTask: function (options) {
      // revert permissions
      exec('chmod -R g-w,u-w {xt.srcdir}'.format(options));
    }
  });
})();
