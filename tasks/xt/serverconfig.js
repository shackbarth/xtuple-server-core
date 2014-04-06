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
     * Location of datasource config file
     */
    configdir: null,

    /**
     * Location of log files for node service
     */
    logdir: null,

    /**
     * Location of state files such as PIDs
     */
    statedir: null,

    /** @override */
    beforeTask: function (options) {
      var version = options.xt.version,
        name = options.xt.name;

      options.xt.configdir = path.resolve('/etc/xtuple', version, name);
      options.xt.logdir = path.resolve('/var/log/xtuple', version, name);
      options.xt.statedir = path.resolve('/var/lib/xtuple', version, name);

      // ensure path integrity and write config file
      exec('mkdir -p ' + options.xt.configdir);
      exec('mkdir -p ' + options.xt.logdir);
      exec('mkdir -p ' + options.xt.statedir);
    },

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        pg = options.pg,
        domain = options.nginx.domain,
        sample_path = path.resolve(xt.coredir, 'node-datasource/sample_config'),
        config_path = path.resolve('/etc/xtuple', xt.version, pg.name),
        config_js = path.resolve(config_path, 'config.js'),
        encryption_key_path = path.resolve(config_path, 'encryption_key.txt'),
        ssl_path = path.resolve(config_path, 'ssl'),
        ssl_crt = path.resolve(ssl_path, domain + '.crt'),
        sample_config = require(sample_path),
        sample_obj = JSON.parse(JSON.stringify(sample_config)),

        // replace default config.js values
        derived_config_obj = _.extend(sample_obj, {
          processName: 'xt-web-' + options.xt.name,
          datasource: _.extend(sample_config.datasource, {
            name: domain,
            keyFile: options.nginx.outkey,
            certFile: options.nginx.outcrt,
            saltFile: path.resolve(config_path, 'salt.txt'),
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
      fs.writeFileSync(path.resolve(config_path, 'salt.txt'), salt);

      // write encryption file
      encryptionKey = exec('openssl rand 128 -hex').stdout;
      fs.writeFileSync(encryption_key_path, encryptionKey);

      if (!fs.existsSync(ssl_crt)) {
        exec('mkdir -p ' + ssl_path);
        require('../nginx/ssl').generate(ssl_path, domain);
      }

      // ensure correct permissions
      exec('chown -R xtuple:xtadmin /etc/xtuple');
      exec('chown -R xtuple:xtadmin /var/log/xtuple');
      exec('chown -R xtuple:xtadmin /var/lib/xtuple');
      exec('chown -R xtuple:xtadmin /usr/local/xtuple');

      exec('sudo chmod -R ug+r    /etc/xtuple');
      exec('sudo chmod -R ug+rw   /var/log/xtuple');
      exec('sudo chmod -R ug+rw   /var/lib/xtuple');
      exec('sudo chmod -R ug+rwx  /usr/local/xtuple');

      _.defaults(options.xt.serverconfig, {
        string: output_conf,
        json: derived_config_obj,
        config_path: config_path,
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
