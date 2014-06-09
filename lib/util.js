var path = require('path'),
  exec = require('execSync').exec,
  moment = require('moment');

module.exports = {

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
    if (options.pg.pilot === true) {
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
    return parseInt(options.pg.cluster.port) + exports.portOffset;
  },

  /** @public */
  getServerSSLPort: function (options) {
    return parseInt(options.pg.cluster.port) + exports.portOffset - 445;
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
      lib.xt.build.hasPrivateExtensions(options) && 'private-extensions'
    ]);
  }
};
