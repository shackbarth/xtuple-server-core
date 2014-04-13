(function () {
  'use strict';

  /**
   * Generate the config file for the testing framework.
   */
  var testconfig = exports;

  var lib = require('../../lib'),
    format = require('string-format'),
    path = require('path'),
    exec = require('execSync').exec,
    fs = require('fs'),
    _ = require('underscore'),
    xtPhase = require('./index');

  _.extend(testconfig, lib.task, /** @exports testconfig */ {

    /** @override */
    beforeInstall: function (options) {
      options.xt.testloginfile = path.resolve(options.xt.configdir, 'test/login_data.js');
      options.xt.testconfigfile = path.resolve(options.xt.configdir, 'test/config.js');

      exec('mkdir -p ' + path.resolve(options.xt.configdir, 'test'));
      require('./runtests').afterTask(options);

      try {
        fs.unlinkSync(path.resolve(options.xt.coredir, 'node-datasource/config.js'));
        fs.unlinkSync(path.resolve(options.xt.coredir, 'test/lib/login_data.js'));
      }
      catch (e) { }
    },

    /** @override */
    doTask: function (options) {
      var loginObject = {
          data: {
            webaddress: 'https://{nginx.hostname}:443'.format(options),
            username: 'admin',
            pwd: options.xt.adminpw,
            org: 'xtuple_demo'
          }
        },
        testOptions = _.clone(options);

      testOptions.xt = _.extend({ }, options.xt, {
        name: 'admin',
        configfile: options.xt.testconfigfile
      });
      testOptions.xt.serverconfig = { };

      require('./serverconfig').doTask(testOptions);

      fs.writeFileSync(options.xt.testloginfile, lib.xt.build.wrapModule(loginObject));
    },

    /**
     * Create temporary symlinks in the src directory; this is the consequence
     * of our current design. Future work might make tests runnable from anywhere
     *
     * @override
     */
    afterTask: function (options) {
      // cleanup first, or symlinks will fail
      //runtests.afterTask(options);

      fs.symlinkSync(
        options.xt.testconfigfile,
        path.resolve(options.xt.coredir, 'node-datasource/config.js')
      );
      fs.symlinkSync(
        options.xt.testloginfile,
        path.resolve(options.xt.coredir, 'test/lib/login_data.js')
      );

    },
  });
})();
