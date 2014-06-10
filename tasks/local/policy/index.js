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
    exec('usermod -a -G www-data,ssl-cert,postgres,xtuser {xt.name}'.format(options)),
    exec('chown -R {xt.name}:xtuser ~/.xtuple'.format(options));
    exec('chown -R {xt.name}:postgres /var/run/postgresql'.format(options));
  }
});
