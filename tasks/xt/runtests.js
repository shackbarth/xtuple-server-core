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

    /**
     * Create temporary symlinks in the src directory; this is the consequence
     * of our current design. Future work might make tests runnable from anywhere
     *
     * @override
     */
    beforeTask: function (options) {
      // cleanup first, or symlinks will fail
      //runtests.afterTask(options);
      rimraf.sync(path.resolve(options.xt.coredir, 'node-datasource/config.js'));
      rimraf.sync(path.resolve(options.xt.coredir, 'test/lib/login_data.js'));

      fs.symlinkSync(
        path.resolve(options.xt.configdir, 'test/config.js'),
        path.resolve(options.xt.coredir, 'node-datasource/config.js')
      );
      fs.symlinkSync(
        path.resolve(options.xt.configdir, 'test/login_data.js'),
        path.resolve(options.xt.coredir, 'test/lib/login_data.js')
      );
    },

    /** @override */
    doTask: function (options) {
      var server = spawn('cd {xt.coredir} && npm start'),
        wait, tests;

      server.stderr.on('data', function (data) {
        throw new Error(data);
      });
      server.on('close', function (code) {
        if (code !== 0) {
          throw new Error('node datasource exited with code '+ code);
        }
      });

      wait = sleep.sleep(10);
      exec('service nginx reload');

      tests = exec('cd {xt.coredir} && npm test'.format(options));

      options.xt.runtests.core = (tests.code === 0);

      if (!options.xt.runtests.core) {
        throw new Error(tests.stdout);
      }

      server.kill();
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
