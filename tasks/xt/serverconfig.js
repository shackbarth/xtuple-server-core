(function () {
  'use strict';

  /**
   * Generate the config.js file
   */
  var serverconfig = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    exec = require('execSync').exec,
    _ = require('underscore'),
    m = require('mstring');

  _.extend(serverconfig, task, /** @exports serverconfig */ {



    // TODO turn into .json
    config_template: m(function () {
      /***
      // {params}
      (function () {
        'use strict';

        module.exports = {json};

      })();

      ***/
    }),

    /**
     * Location of log files for node service
     */
    logdir: null,

    /**
     * Location of state files such as PIDs
     */
    statedir: null,

    /** @override */
    beforeInstall: function (options) {
      var version = options.xt.version,
        name = options.xt.name;

      options.xt.configdir = path.resolve('/etc/xtuple', version, name);
      options.xt.ssldir = path.resolve('/etc/xtuple', version, name, 'ssl');
      options.xt.logdir = path.resolve('/var/log/xtuple', version, name);
      options.xt.statedir = path.resolve('/var/lib/xtuple', version, name);

      // ensure path integrity and write config file
      exec('mkdir -p ' + options.xt.ssldir);
      exec('mkdir -p ' + options.xt.configdir);
      exec('mkdir -p ' + options.xt.logdir);
      exec('mkdir -p ' + options.xt.statedir);

      // correctly permission ssldir. should be owned by ssl-cert group if not already
      //exec('chown -R :ssl-cert '+ options.xt.ssldir);
      //exec('chmod -R o-rwx,g=wrx,u=rx '+ options.xt.ssldir);
      exec('usermod -a -G ssl-cert postgres');
      exec('usermod -a -G ssl-cert www-data');
      exec('usermod -a -G ssl-cert xtadmin');
    },

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        pg = options.pg,
        domain = options.nginx.domain,
        sample_path = path.resolve(xt.coredir, 'node-datasource/sample_config'),
        config_js = path.resolve(xt.configdir, 'config.js'),
        encryption_key_path = path.resolve(xt.configdir, 'encryption_key.txt'),
        sample_config = require(sample_path),
        sample_obj = JSON.parse(JSON.stringify(sample_config)),

        // replace default config.js values
        derived_config_obj = _.extend(sample_obj, {
          processName: 'xt-web-' + options.xt.name,
          datasource: _.extend(sample_config.datasource, {
            name: domain,
            keyFile: options.nginx.outkey,
            certFile: options.nginx.outcrt,
            saltFile: path.resolve(xt.configdir, 'salt.txt'),
            encryptionKeyFile: encryption_key_path,
            hostname: domain,
            description: options.nginx.sitename,
            port: serverconfig.getServerPort(options) - 445,
            redirectPort: serverconfig.getServerPort(options),
            databases: _.pluck(xt.database.list, 'flavor'),
            testDatabase: 'demo',
          }),
          databaseServer: _.extend(sample_config.databaseServer, {
            hostname: 'localhost',
            user: 'admin',
            password: xt.adminpw,
            port: parseInt(pg.cluster.port)
          })
        }),
        output_conf = serverconfig.config_template.format({
          json: JSON.stringify(derived_config_obj, null, 2),
          params: JSON.stringify(xt)
        }),
        salt,
        encryptionKey;

      fs.writeFileSync(config_js, output_conf);
          
      // write salt file
      // XXX QUESTION: is this really a salt, or an actual private key?
      salt = exec('head -c 64 /dev/urandom | base64 | sed "s/[=\\s]//g"').stdout;
      fs.writeFileSync(path.resolve(xt.configdir, 'salt.txt'), salt);

      // write encryption file
      encryptionKey = exec('openssl rand 128 -hex').stdout;
      fs.writeFileSync(encryption_key_path, encryptionKey);

      _.extend(options.xt.serverconfig, {
        string: output_conf,
        json: derived_config_obj,
        config_js: config_js
      });
    },

    /**
     * Offset from the postgres cluster port that this server connects to,
     * default port minus postgres port.
     * (8888 - 5432)
     *
     * Interestingly:
     * (3456 mod 1111) + (5432 mod 1111) = 1111
     *
     * @memberof serverconfig
     */
    portOffset: 3456,

    /**
     * @public
     */
    getServerPort: function (options) {
      return parseInt(options.pg.cluster.port) + serverconfig.portOffset;
    }
  });
})();
