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
    _ = require('lodash');

  _.extend(testconfig, lib.task, /** @exports testconfig */ {

    /** @override */
    executeTask: function (options) {
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
        password: options.xt.adminpw,
        configfile: options.xt.testconfigfile
      });
      testOptions.xt.serverconfig = { };
      testOptions.xt.testdb = 'xtuple_demo';

      require('./serverconfig').writeConfig(testOptions);
      //require('./serverconfig').executeTask(testOptions);

      fs.writeFileSync(options.xt.testloginfile, lib.xt.build.wrapModule(loginObject));
    }
  });
})();
