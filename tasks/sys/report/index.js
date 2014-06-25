var lib = require('xtuple-server-lib'),
  exec = require('execSync').exec,
  mkdirp = require('mkdirp'),
  _ = require('lodash'),
  fs = require('fs'),
  path = require('path');

_.extend(exports, lib.task, /** @exports report */ {

  /** @override */
  beforeInstall: function (options) {
    if (/^install/.test(options.planName) {
      options.sys.installArgumentsFile = path.resolve(options.xt.configdir, 'install-arguments.json');
      mkdirp.sync(path.dirname(options.sys.installArgumentsFile));
      options.xt && options.xt.configdir && fs.writeFileSync(
        path.resolve(options.xt.configdir, 'install-arguments.json'),
        JSON.stringify(options, null, 2)
      );
    }
    options.report || (options.report =  { });
  },

  /** @override */
  executeTask: function (options) {
    if (!_.isEmpty(options.xt.adminpw)) {
      options.report['xTuple Login'] = {
        domain: options.nginx.domain,
        user: 'admin',
        password: options.xt.adminpw
      };
    }
    if (!_.isEmpty(options.sys.policy.remotePassword)) {
      options.report['Remote Management Access'] = {
        user: 'xtremote',
        password: options.sys.policy.remotePassword
      };
    }
    if (!_.isEmpty(options.sys.policy.userPassword)) {
      options.report['System User Account'] = {
        user: options.xt.name,
        password: options.sys.policy.userPassword
      };
    }
    if (/^install/.test(options.planName)) {
      options.report['Instance Details'] = {
        'Instance Name': options.pg.cluster.name,
        'Postgres Port': options.pg.cluster.port,
        'Public Web Domain': options.nginx.domain,
        'Direct Public Web Port': options.nginx.safeport
      };
    }

    console.log();
    console.log(JSON.stringify(options.report, null, 2));
    console.log('Write this information down now.');
    console.log();
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
