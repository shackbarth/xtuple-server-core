var path = require('path'),
  exec = require('execSync').exec,
  moment = require('moment'),
  semver = require('semver'),
  _ = require('lodash');

var util = module.exports = {

  /** 
   * Return home directory
   */
  getUserHome: function () {
    return path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']);
  },

  /**
   * Map edition -> extension[]. These lists of extensions are in addition
   * to the 'core' extensions already installed by default.
   */
  editions: {
    core: [ ],
    manufacturing: [
      'inventory',
      'manufacturing'
    ],
    distribution: [
      'inventory',
      'distribution'
    ],
    enterprise: [
      'inventory',
      'distribution',
      'manufacturing'
    ]
  },

  // extension path mapping
  // FIXME deprecate with npm modularization
  extension_prefixes: {
    'private': [
      'manufacturing',
      'inventory',
      'distribution'
    ],
    'xtuple': [

    ]
  },

  /**
   * Generate the core app installation command
   * @static
   */
  getCoreBuildCommand: function (db, options) {
    var formatter = _.extend({
        bin: path.resolve(options.xt.usersrc, 'scripts/build_app.js'),
      }, db, options),
      cmd = [
        'cd {xt.usersrc} &&',
        'sudo -u {xt.name} {xt.nodeBin} {bin}',
        '-c {xt.configfile}',
        '-d {dbname}',
        '-i -b {filename}'
      ].join(' ').format(formatter);

    console.log(cmd);

    return cmd;
  },

  /**
   * Generate the command to build xtuple databases from source
   * @static
   */
  getSourceBuildCommand: function (db, options) {
    var formatter = _.extend({
        bin: path.resolve(options.xt.usersrc, 'scripts/build_app.js'),
      }, db, options),
      cmd = [
        'cd {xt.usersrc} &&',
        'sudo -u {xt.name} {xt.nodeBin} {bin}',
        '-c {xt.configfile}',
        '-d {dbname}',
        '-i -s {filename}'
      ].join(' ').format(formatter);

    console.log(cmd);

    return cmd;
  },

  /**
   * Generate the extension installation command
   * @static
   */
  getExtensionBuildCommand: function (db, options, extension) {
    var private_ext_path = path.resolve(options.xt.usersrc, '..', 'private-extensions'),
      public_ext_path = path.resolve(options.xt.usersrc, '..', 'xtuple-extensions'),
      prefix = _.find(_.keys(util.extension_prefixes), function (key) {
        return _.contains(util.extension_prefixes[key], extension);
      }),
      formatter = _.extend({
        bin: path.resolve(options.xt.usersrc, 'scripts/build_app.js'),
        extension_path: path.resolve(options.xt.usersrc, '..', prefix + '-extensions', 'source', extension)
      }, db, options);

    var cmd = [
      'cd {xt.usersrc} &&',
      'sudo -u {xt.name} {xt.nodeBin} {bin}',
      '-c {xt.configfile}',
      '-e {extension_path}',
      '-d {dbname}'
    ].join(' ').format(formatter);

    console.log(cmd);

    return cmd;
  },

  /**
   * Return whether this installation will install any private extensions
   */
  hasPrivateExtensions: function (options) {
    return _.intersection(
      util.extension_prefixes.private, util.editions[options.xt.edition]
    ).length > 0;
  },

  /**
   * Return true if the xtuple version to install is a tag and false
   * otherwise.
   */
  isTaggedVersion: function (options) {
    return semver.valid(options.xt.version);
  },

  wrapModule: function (obj) {
    return 'module.exports = '+ JSON.stringify(obj, null, 2) + ';';
  },

  /**
   * Generate password using openssl rand
   * @public
   */
  getPassword: function () {
    exec('sleep 1');
    var pass = exec('openssl rand 6 | base64');
      
    if (pass.code === 0 && !_.isEmpty(pass.stdout)) {
      return pass.stdout.trim().replace(/\W/g, '');
    }
    else {
      throw new Error('Failed to generate password: '+ JSON.stringify(pass));
    }
  },


  /** @public */
  getDatabaseNameSuffix: function (options) {
    if (options.planName === 'install-pilot') {
      return '_pilot';
    }
    else {
      return '_live';
    }
  },

  /**
   * Return the name of a forked database.
   * @public
   */
  getForkName: function (options, globals) {
    return '{dbname}_copy_{ts}'.format({
      dbname: globals ? 'globals' : options.pg.dbname,
      ts: moment().format('MMDDhhmm')
    });
  },

  /**
   * Return path of a snapshot file
   * @param options - typical options object
   * @param options.pg.dbname - name of database
   * @public
   */
  getSnapshotPath: function (options, globals) {
    var ext = (globals ? '.sql' : '.dir.gz');
    return path.resolve(options.pg.snapshotdir, exports.getForkName(options, globals) + ext);
  },

  /**
   * Return an object consisting of the backup filename components.
   * @public
   */
  parseForkName: function (filename) {
    var base = path.basename(filename),
      halves = base.split('_copy_');

    return {
      original: filename,
      dbname: halves[0],
      ts: moment(halves[1], 'MMDDhhmm').valueOf()
    };
  },

  /**
   * Derive the name of the postgres cluster from the options.
   * @public
   */
  getClusterName: function (options) {
    if (options.planName === 'install-pilot') {
      return options.xt.name + '-' + options.xt.version + '-pilot';
    }
    else {
      return options.xt.name + '-' + options.xt.version + '-live';
    }
  },

  /**
   * Offset from the postgres cluster port that this server connects to,
   * default port minus postgres port.
   * (8888 - 5432)
   *
   * Interestingly:
   * (3456 mod 1111) + (5432 mod 1111) = 1111
   *
   * @memberof lib.util
   * @public
   */
  portOffset: 3456,

  /** @public */
  getServerPort: function (options) {
    return parseInt(options.pg.cluster.port) + util.portOffset;
  },

  /** @public */
  getServerSSLPort: function (options) {
    return parseInt(options.pg.cluster.port) + util.portOffset - 445;
  },

  /** @public */
  getRandom: function (bitlen) {
    return exec('openssl rand '+ bitlen +' -hex').stdout;
  },

  /**
   * @return list of repositories to clone
   * @public
   */
  getRepositoryList: function (options) {
    return _.compact([
      'xtuple',
      'xtuple-extensions',
      util.hasPrivateExtensions(options) && 'private-extensions'
    ]);
  }
};
