(function () {
  'use strict';

  /**
   * Generate the config file for the testing framework.
   */
  var runtests = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    rimraf = require('rimraf'),
    exec = require('execSync').exec,
    fs = require('fs'),
    _ = require('lodash');

  _.extend(runtests, task, /** @exports runtests */ {

    /** @override */
    executeTask: function (options) {
      var tests = exec('cd {xt.usersrc} && sudo -u {xt.name} npm test'.format(options));

      options.xt.runtests.core = (tests.code === 0);

      if (!options.xt.runtests.core) {
        throw new Error(tests.stdout);
      }

      /*
      var server = spawn('node', ['node-datasource/main.js'], {
          cwd: options.xt.usersrc,
          uid: parseInt(exec('id -u {xt.name}'.format(options)).stdout)
        }),
        wait = exec('sleep 10'),
        tests = exec('cd {xt.usersrc} && sudo -u {xt.name} npm test'.format(options));

      options.xt.runtests.core = (tests.code === 0);

      if (!options.xt.runtests.core) {
        throw new Error(tests.stdout);
      }
      */

      //server.kill();
      //console.log(tests.stdout);
    }
  });
})();
