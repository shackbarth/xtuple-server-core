var lib = require('xtuple-server-lib'),
  exec = require('execSync').exec,
  rimraf = require('rimraf'),
  path = require('path'),
  _ = require('lodash'),
  prefix = path.resolve(lib.util.getUserHome(), '.xtuple');

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

  /** @override */
  beforeInstall: function (options) {
    options.sys || (options.sys = { });
    options.sys.paths || (options.sys.paths = { });

    options.xt.name = process.env.SUDO_USER;
    options.xt.name = process.env.SUDO_USER;
    if (_.isEmpty(options.xt.name)) {
      throw new Error('There is no SUDO_USER value set. I don\'t know why this would be. Please file an issue');
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
    //options.xt.buildconfigfile = path.resolve(options.xt.configdir, 'build/config.js');
    options.xt.ssldir = path.resolve(exports.etcXtuple, version, name, 'ssl');
    options.xt.rand64file = path.resolve(exports.etcXtuple, version, name, 'rand64.txt');
    options.xt.key256file = path.resolve(exports.etcXtuple, version, name, 'key256.txt');
    options.xt.userhome = lib.util.getUserHome();
    options.xt.usersrc = process.cwd();

    // shared config (per account)
    options.xt.homedir = path.resolve(exports.usrLocalXtuple);

    // other system paths
    options.xt.logdir = path.resolve(exports.varLog, 'xtuple', version, name);
    options.pg.logdir = path.resolve(exports.varLog, 'postgresql');
    options.xt.socketdir = path.resolve('/var/run/postgresql');
    options.xt.rundir = path.resolve(exports.varRun, 'xtuple', version, name);
    options.xt.statedir = path.resolve(exports.varLibXtuple, version, name);
    options.sys.sbindir = path.resolve(exports.usrSbin, 'xtuple', version, name);
    options.sys.htpasswdfile = path.resolve('/etc/nginx/.htpasswd-xtuple');

    // repositories
    options.xt.srcdir = path.resolve(options.xt.usersrc, '..');
    options.xt.coredir = options.xt.usersrc;
    options.xt.extdir = path.resolve(options.xt.srcdir, 'xtuple-extensions');

    options.pg.snapshotdir = path.resolve(exports.varLibXtuple, options.xt.version, options.xt.name, 'snapshots');
  },

  /**
   * Create the paths.
   * @public
   */
  createPaths: function (options) {
    exec('mkdir -p ' + options.xt.userhome);
    exec('mkdir -p ' + options.pg.snapshotdir);

    exec('mkdir -p ' + options.xt.configdir);
    exec('mkdir -p ' + path.resolve(options.xt.configdir, 'build'));
    exec('mkdir -p ' + options.xt.ssldir);
    exec('mkdir -p ' + options.xt.logdir);
    exec('mkdir -p ' + options.xt.rundir);
    exec('mkdir -p ' + options.xt.socketdir);
    exec('mkdir -p ' + options.xt.statedir);
    exec('mkdir -p ' + options.xt.srcdir);
    exec('mkdir -p ' + options.sys.sbindir);
  }
});
