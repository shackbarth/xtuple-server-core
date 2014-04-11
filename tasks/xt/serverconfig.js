(function () {
  'use strict';

  /**
   * Generate the config.js file
   */
  var serverconfig = exports;

  var lib = require('../../lib'),
    format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    exec = require('execSync').exec,
    _ = require('underscore'),
    m = require('mstring');

  _.extend(serverconfig, lib.task, /** @exports serverconfig */ {

    /** @override */
    beforeTask: function (options) {
      options.xt.port = serverconfig.getServerPort(options);
      options.xt.sslport = serverconfig.getServerSSLPort(options);
    },

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        pg = options.pg,
        sample_path = path.resolve(xt.coredir, 'node-datasource/sample_config'),
        sample_config = require(sample_path),
        sample_obj = JSON.parse(JSON.stringify(sample_config)),

        // replace default config.js values
        derived_config_obj = _.extend(sample_obj, {
          processName: 'xt-web-' + options.xt.name,
          datasource: _.extend(sample_config.datasource, {
            name: options.nginx.domain,
            keyFile: options.nginx.outkey,
            certFile: options.nginx.outcrt,
            saltFile: options.xt.rand64file,
            encryptionKeyFile: options.xt.key256file,
            hostname: options.nginx.hostname,
            description: options.nginx.sitename,
            port: options.xt.sslport,
            redirectPort: options.xt.port,
            databases: _.pluck(xt.database.list, 'dbname'),
            testDatabase: 'demo',
          }),
          databaseServer: _.extend(sample_config.databaseServer, {
            hostname: options.xt.socketdir, // TODO support remote databases via SSL clientcert auth
            user: xt.name,
            password: undefined,
            port: parseInt(pg.cluster.port)
          })
        }),
        output_conf = lib.xt.build.wrapModule(derived_config_obj);

      fs.writeFileSync(options.xt.configfile, output_conf);
          
      // write salt file
      // XXX QUESTION: is this really a salt, or an actual private key? is it
      // necessary? I am ignorant of its purpose and cannot find docs on it
      if (!fs.existsSync(options.xt.rand64file)) {
        fs.writeFileSync(
          options.xt.rand64file,
          exec('head -c 64 /dev/urandom | base64 | sed "s/[=\\s]//g"').stdout
        );
      }

      // write encryption file if it does not exist
      if (!fs.existsSync(options.xt.key256file)) {
        fs.writeFileSync(
          options.xt.key256file,
          exec('openssl rand 256 -hex').stdout
        );
      }

      _.extend(options.xt.serverconfig, {
        string: output_conf,
        json: derived_config_obj
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
    },
    getServerSSLPort: function (options) {
      return parseInt(options.pg.cluster.port) + serverconfig.portOffset - 445;
    },

    getRandom: function (bitlen) {
      return exec('openssl rand '+ bitlen +' -hex').stdout;
    },
    
  });
})();
