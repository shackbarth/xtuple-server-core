(function () {
  'use strict';

  /**
   * Generate the config file for the testing framework.
   */
  var testconfig = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    exec = require('execSync').exec,
    fs = require('fs'),
    _ = require('underscore'),
    xtPhase = require('./index');

  _.extend(testconfig, task, /** @exports testconfig */ {

    /** @override */
    beforeInstall: function (options) {
      options.xt.testloginfile = path.resolve(options.xt.configdir, 'test/login_data.js');
      options.xt.testconfigfile = path.resolve(options.xt.configdir, 'test/config.js');

      exec('mkdir -p ' + path.resolve(options.xt.configdir, 'test'));
    },

    /** @override */
    doTask: function (options) {

      var loginObject = {
          data: {
            webaddress: 'https://{nginx.sitename}.localhost:443'.format(options),
            username: 'admin',
            pwd: options.xt.adminpw,
            org: 'xtuple-demo'
          }
        },
        testOptions = _.clone(options);

      testOptions.xt = _.extend({ }, options.xt, {
        name: 'admin',
        configfile: options.xt.testconfigfile
      });
      testOptions.xt.serverconfig = { };

      require('./serverconfig').doTask(testOptions);

      fs.writeFileSync(options.xt.testloginfile, JSON.stringify(loginObject, null, 2));
    }
  });
})();
