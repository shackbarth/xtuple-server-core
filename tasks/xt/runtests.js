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
    spawn = require('child_process').spawn,
    sleep = require('sleep'),
    exec = require('execSync').exec,
    fs = require('fs'),
    _ = require('underscore'),
    m = require('mstring');

  _.extend(runtests, task, /** @exports runtests */ {

    /** @override */
    doTask: function (options) {
      var server = exec('cd {xt.coredir} && sudo -u {xt.name} npm start &'.format(options)),
        wait, tests;

      /*
      server.stdout.on('data', function (data) {
        console.log(data);
      });
      server.stderr.on('data', function (data) {
        throw new Error(data);
      });
      server.on('close', function (code) {
        if (code !== 0) {
          throw new Error('node datasource exited with code '+ code);
        }
      });
      */

      console.log(server);

      wait = sleep.sleep(10);
      console.log(wait);

      tests = exec('cd {xt.coredir} && sudo -u {xt.name} npm test'.format(options));

      options.xt.runtests.core = (tests.code === 0);

      if (!options.xt.runtests.core) {
        throw new Error(tests.stdout);
      }

      //server.kill();
    },

    /**
     * Clean up temporary stuff setup in runtests#beforeTask
     * @override
     */
    afterTask: function (options) {
      console.log('removing test symlinks');
      console.log(path.resolve(options.xt.coredir, 'node-datasource/config.js'));
      console.log(path.resolve(options.xt.coredir, 'test/lib/login_data.js'));
      console.log(options.xt.coredir);

      //rimraf.sync(path.resolve(options.xt.coredir, 'node-datasource/config.js'));
      //rimraf.sync(path.resolve(options.xt.coredir, 'test/lib/login_data.js'));
    }

  });

})();
