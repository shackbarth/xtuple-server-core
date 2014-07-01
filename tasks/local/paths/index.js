var lib = require('xtuple-server-lib'),
  rimraf = require('rimraf'),
  mkdirp = require('mkdirp'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  home = require('home-dir'),
  prefix = path.resolve(home(), '.xtuple');

/**
 * Sets up system file and directory paths
 */
_.extend(exports, lib.task, /** @exports xtuple-server-local-paths */ {

  etcXtuple: path.resolve(prefix, 'etc/xtuple'),
  usrLocal: path.resolve(prefix, 'usr/local'),
  usrLocalXtuple: path.resolve(prefix, 'usr/local/xtuple'),
  usrSbin: path.resolve(prefix, 'usr/sbin'),
  varLog: path.resolve(prefix, 'var/log'),
  varLibXtuple: path.resolve(prefix, 'var/lib/xtuple'),
  varRun: path.resolve(prefix, 'var/run'),

  options: {
    workspace: {
      optional: '[path]',
      description: 'The path of the local workspace in which to install',
      value: process.cwd(),
      validate: function (value) {
        log.info('local-workspace', value);
        var pkg = require(path.resolve(value, 'package'));

        if (!_.isObject(pkg) || pkg.name !== 'xtuple') {
          throw new Error('Run this command from xtuple git directory, or correctly set --local-workspace <path_to_xtuple>');
        }

        return value;
      }
    }
  },

  /** @override */
  beforeInstall: function (options) {
    options.sys || (options.sys = { });
    options.sys.paths || (options.sys.paths = { });

    if (!options.xt.version) {
      try {
        options.xt.version = require(path.resolve(options.local.workspace, 'package')).version;
      }
      catch (e) {
        throw new TypeError('Can\'t find xTuple package. xt.version or local.workspace might be incorrect');
      }
    }
    options.xt.name = process.env.SUDO_USER;

    if (_.isEmpty(options.xt.name)) {
      throw new Error('There is no SUDO_USER set. I don\'t know why this would be. Please file an issue');
    }
    if (_.isEmpty(options.xt.version)) {
      throw new Error('There is no version set. I don\'t know why this would be. Please file an issue');
    }

    exports.definePaths(options);
  },

  /** @override */
  executeTask: function (options) {
    exports.createPaths(options);
  },

  /**
   * Define the paths needed and used by the xTuple server.
   * @public
   */
  definePaths: function (options) {
    var version = options.xt.version,
      name = options.xt.name;

    // node server/config stuff
    options.xt.configdir = path.resolve(exports.etcXtuple, version, name);
    options.xt.configfile = path.resolve(options.xt.configdir, 'config.js');
    options.xt.ssldir = path.resolve(exports.etcXtuple, version, name, 'ssl');
    options.xt.rand64file = path.resolve(exports.etcXtuple, version, name, 'rand64.txt');
    options.xt.key256file = path.resolve(exports.etcXtuple, version, name, 'key256.txt');
    options.xt.userhome = home();

    // shared config (per account)
    options.xt.homedir = path.resolve(exports.usrLocalXtuple);
    options.xt.dist = path.resolve(options.local.workspace, '..');
    options.xt.userdist = options.xt.dist;

    options.xt.coredir = options.local.workspace;

    // other system paths
    options.xt.logdir = path.resolve(exports.varLog, 'xtuple', version, name);
    options.pg.logdir = path.resolve(exports.varLog, 'postgresql');
    options.xt.socketdir = path.resolve('/var/run/postgresql');

    options.pg.snapshotdir = path.resolve(exports.varLibXtuple, options.xt.version, options.xt.name, 'snapshots');
  },

  /**
   * Create the paths.
   * @public
   */
  createPaths: function (options) {
    if (!fs.existsSync(options.xt.userhome)) {
      mkdirp.sync(options.xt.userhome);
    }
    mkdirp.sync(options.xt.userdist);
    mkdirp.sync(options.pg.snapshotdir);

    mkdirp.sync(options.xt.configdir);
    mkdirp.sync(options.xt.ssldir);
    mkdirp.sync(options.xt.logdir);
  }
});
