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
    beforeTask: function (options) {
      exec('service nginx restart');
    },

    /** @override */
    doTask: function (options) {
      var server = exec('cd {xt.coredir} && sudo -u {xt.name} npm start &'.format(options)),
        wait = sleep.sleep(10),
        tests = exec('cd {xt.coredir} && sudo -u {xt.name} npm test'.format(options));

      options.xt.runtests.core = (tests.code === 0);

      try {
        fs.unlinkSync(path.resolve(options.xt.coredir, 'node-datasource/config.js'));
        fs.unlinkSync(path.resolve(options.xt.coredir, 'test/lib/login_data.js'));

        exec('killall -u {xt.name} node'.format(options));
      }
      catch (e) {
      
      }

      if (!options.xt.runtests.core) {
        throw new Error(tests.stdout);
      }
    },

    /**
     * Clean up temporary stuff setup in runtests#beforeTask
     * @override
     */
    afterTask: function (options) {
    }
  });

})();
