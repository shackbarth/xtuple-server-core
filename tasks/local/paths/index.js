var lib = require('xtuple-server-lib'),
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
        var pkg;
        try {
          pkg = require(path.resolve(value, 'package'));
        } catch (e) {}

        if (!_.isObject(pkg) || pkg.name !== 'xtuple') {
          throw new Error("Can't find the xtuple package. Make sure you have " +
                          "cloned xtuple.git. Then either run this command "   +
                          "from the xtuple git directory or set "              +
                          "--local-workspace <path_to_xtuple>");
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
    
    if (!_.isEmpty(options.xt.name) && options.xt.name !== process.env.SUDO_USER) {
      log.warn('local-paths', 'ignoring', ('--xt-name ' + options.xt.name).magenta);
      log.warn('local-paths', 'using', process.env.SUDO_USER.green, 'as --xt-name');
      log.warn('local-paths', 'You should not use --xt-name with a "dev" install. it is ignored anyway.');
    }
    options.xt.name = process.env.SUDO_USER;

    if (_.isEmpty(options.xt.name)) {
      throw new Error('There is no SUDO_USER set. I don\'t know why this would be. Please file an issue');
    }
    if (options.xt.name === 'root') {
      throw new Error('xTuple cannot be installed for the root user');
    }
    if (_.isEmpty(options.xt.version)) {
      throw new Error('There is no version set. I don\'t know why this would be. Please file an issue');
    }

    options.xt.id = lib.util.$(options);
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
    options.pg = options.pg || { };

    // node server/config stuff
    options.xt.configdir = path.resolve(exports.etcXtuple, options.xt.id);
    options.xt.configfile = path.resolve(options.xt.configdir, 'config.js');
    options.xt.ssldir = path.resolve(options.xt.configdir, 'ssl');
    options.xt.homedir = path.resolve(exports.usrLocalXtuple);
    options.xt.dist = path.resolve(options.local.workspace, '..');

    // shared config (per account)
    options.xt.userhome = home();
    options.xt.userconfig = path.resolve(options.xt.userhome, '.xtuple');
    options.xt.typeconfig = path.resolve(options.xt.userconfig, options.type);
    options.xt.rand64file = path.resolve(options.xt.typeconfig, 'rand64.txt');
    options.xt.key256file = path.resolve(options.xt.typeconfig, 'key256.txt');
    options.xt.userdist = options.xt.dist;
    options.xt.coredir = options.local.workspace;

    // other system paths
    options.xt.logdir = path.resolve(exports.varLog, 'xtuple', options.xt.id);
    options.pg.logdir = path.resolve(exports.varLog, 'postgresql');
    options.xt.socketdir = path.resolve('/var/run/postgresql');
    options.xt.rundir = path.resolve(exports.varRun, 'xtuple', options.xt.id);
    options.xt.statedir = path.resolve(exports.varLibXtuple, options.xt.id);

    options.pg.snapshotdir = path.resolve(exports.varLibXtuple, options.xt.id, 'snapshots');
  },

  /**
   * Create the paths.
   * @public
   */
  createPaths: function (options) {
    mkdirp.sync(options.xt.userhome);
    mkdirp.sync(options.xt.userconfig);
    mkdirp.sync(options.xt.typeconfig);
    mkdirp.sync(options.xt.userdist);
    mkdirp.sync(options.pg.snapshotdir);

    mkdirp.sync(options.xt.dist);
    mkdirp.sync(options.xt.configdir);

    mkdirp.sync(options.xt.ssldir);
    mkdirp.sync(options.xt.logdir);
    mkdirp.sync(options.xt.rundir);
    mkdirp.sync(options.xt.socketdir);
    mkdirp.sync(options.xt.statedir);

    fs.chmodSync(options.xt.configdir, '711');
  }
});
