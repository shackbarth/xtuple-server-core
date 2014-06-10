var lib = require('xtuple-server-lib'),
  exec = require('execSync').exec,
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs');

/**
 * Setup proper permissions and ownership for xTuple files and paths
 */
_.extend(exports, lib.task, /** @exports xtuple-server-local-policy */ {

  /** @override */
  beforeInstall: function (options) {
    options.sys || (options.sys = { });
    options.sys.policy || (options.sys.policy = { });

    options.xt.name = process.env.SUDO_USER;
    if (_.isEmpty(options.xt.name)) {
      throw new Error('There is no SUDO_USER value set. I don\'t know why this would be. Please file an issue');
    }
  },

  /** @override */
  beforeTask: function (options) {
    // if account appears new, that is they've provided no main database,
    // snapshot to restore from, or admin password, generate a admin password
    if (!_.isEmpty(options.xt.name) && !options.xt.adminpw && !options.xt.maindb) {
      options.xt.adminpw = lib.util.getPassword();
    }
  },

  /** @override */
  executeTask: function (options) {
    exports.createUserPolicy(options);
  },

  /** @protected */
  createUserPolicy: function (options) {
    exec('usermod -a -G postgres,xtuser {xt.name}'.format(options)),
    exec('chown -R {xt.name}:xtuser ~/.xtuple'.format(options));
  }
});
