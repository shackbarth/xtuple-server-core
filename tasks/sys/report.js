(function () {
  'use strict';

  var report = exports;

  var lib = require('../../lib'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('lodash'),
    json = require('prettyjson'),
    clc = require('cli-color');

  _.extend(report, lib.task, /** @exports report */ {

    /** @override */
    afterInstall: function (options) {
      options.report = {
        'xTuple Login': {
          domain: options.nginx.domain,
          user: 'admin',
          password: options.xt.adminpw
        }
      };

      if (options.sys.policy.remotePassword) {
        options.report['Remote SSH Access'] = {
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

      console.log(clc.yellow.bold('Access Credentials'));
      console.log(json.render(options.report));
      console.log(clc.red.bold('Write this information down now. This report will disappear in 2 minutes.'));
    },

    /** @override */
    doTask: function (options) {

    }

  });
})();


