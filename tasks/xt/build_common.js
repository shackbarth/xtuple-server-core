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
    beforeTask: function (options) {
      var buildOptions = _.clone(options);

      buildOptions.xt = _.extend({ }, options.xt, {
        //name: 'admin',
        configfile: options.xt.buildconfigfile
      });
      buildOptions.xt.serverconfig = { };
      buildOptions.xt.testdb = 'xtuple_demo';

      require('./serverconfig').doTask(buildOptions);

      exec('chown {xt.name}:{xt.name} {xt.buildconfigfile}'.format(options));
      exec('chmod 700 {xt.buildconfigfile}'.format(options));
    },

    /** @override */
    doTask: function (options) {
      var quickstart = _.findWhere(options.xt.database.list, { dbname: 'xtuple_quickstart' }),
        demo = _.findWhere(options.xt.database.list, { dbname: 'xtuple_demo' }),
        qsBuild, demoBuild;

      if (quickstart) {
        rimraf.sync(path.resolve(options.xt.usersrc, 'scripts/lib/build'));
        qsBuild = exec(build.getCoreBuildCommand(quickstart, options));

        if (qsBuild.code !== 0) {
          throw new Error(qsBuild);
        }
      }
      if (demo) {
        rimraf.sync(path.resolve(options.xt.usersrc, 'scripts/lib/build'));
        var cp = exec([
          'cp',
          path.resolve(demo.filename),
          path.resolve(options.xt.usersrc, 'test/lib/demo-test.backup')
        ].join(' ')),
        buildResult = exec(build.getCoreBuildCommand(demo, options));

        demoBuild = exec('cd {xt.usersrc} && sudo -u {xt.name} npm run-script test-build'.format(options));

        if (demoBuild.code !== 0) {
          throw new Error(JSON.stringify(demoBuild, null, 2));
        }
      }
    }
  });
})();
