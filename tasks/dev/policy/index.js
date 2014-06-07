var lib = require('xtuple-server-lib'),
  exec = require('execSync').exec,
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs');

/**
 * Setup proper permissions and ownership for xTuple files and paths
 */
_.extend(exports, lib.task, /** @exports xtuple-server-dev-policy */ {

  /** @override */
  beforeInstall: function (options) {
    var userBlacklist = [
      'xtuple', 'xtadmin', 'xtremote', 'root', 'admin', 'vagrant', 'postgres', 'node'
    ];
    if (_.contains(userBlacklist, options.xt.name)) {
      throw new Error('Name of xTuple instance is reserved for system use: '+ options.xt.name +
        '. Please provide a different name.');
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
    exec('usermod -a -G postgres,xtuser $USER'.format(options)),
    exec('chown -R $USER:xtuser ~/.xtuple');
  }
});
