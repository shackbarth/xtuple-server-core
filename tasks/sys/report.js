(function () {
  'use strict';

  var report = exports;

  var lib = require('../../lib'),
    exec = require('execSync').exec,
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash');

  _.extend(report, lib.task, /** @exports report */ {

    /** @override */
    beforeInstall: function (options) {
      options.xt && options.xt.configdir && fs.writeFileSync(
        path.resolve(options.xt.configdir, 'install-arguments.json'),
        JSON.stringify(options, null, 2)
      );
    },

    /** @override */
    executeTask: function (options) {
      options.report = {
        'xTuple Login': {
          domain: options.nginx.domain,
          user: 'admin',
          password: options.xt.adminpw
        }
      };

      if (options.sys.policy.remotePassword) {
        options.report['Remote Management Access'] = {
          user: 'xtremote',
          password: options.sys.policy.remotePassword
        };
      }
      if (options.sys.policy.userPassword) {
        options.report['System User Account'] = {
          user: options.xt.name,
          password: options.sys.policy.userPassword
        };
      }

      console.log();
      console.log('Access Credentials');
      console.log(JSON.stringify(options.report, null, 2));
      console.log('Write this information down now. ');
    },

    /** @override */
    afterInstall: function (_options) {
      var options = JSON.parse(JSON.stringify(_options));
      
      if (options.sys.policy) {
        options.sys.policy.remotePassword = '<hidden>';
        options.sys.policy.userPassword = '<hidden>';
        options.sys.policy.adminpw = '<hidden>';
      }

      options.xt && options.xt.configdir && fs.writeFileSync(
        path.resolve(options.xt.configdir, 'install-results.json'),
        JSON.stringify(options, null, 2)
      );
    }
  });
})();
