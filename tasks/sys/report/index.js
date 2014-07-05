var lib = require('xtuple-server-lib'),
  mkdirp = require('mkdirp'),
  _ = require('lodash'),
  render = require('prettyjson').render,
  fs = require('fs'),
  path = require('path');

_.extend(exports, lib.task, /** @exports report */ {

  /** @override */
  beforeInstall: function (options) {
    if (/^install/.test(options.planName)) {
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
  executeTask: function (options) { },

  /** @override */
  afterInstall: function (_options) {
    var options = JSON.parse(JSON.stringify(_options));

    log.info('sys-report', render(options.report));

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
