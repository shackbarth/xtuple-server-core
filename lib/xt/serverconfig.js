(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    exec = require('exec-sync'),
    _ = require('underscore'),
    m = require('mstring');

  var serverconfig = exports;

  _.extend(serverconfig, /** @exports serverconfig */ {

    config_template: 'module.exports = {json};',

    options: {
      srcdir: {
        required: '<path>',
        description: 'Path to the xtuple source directory'
      },
      configdir: {
        optional: '[path]',
        description: 'Location of datasource config file.',
        value: '/etc/xtuple/{version}/{name}'
      },
      logdir: {
        optional: '[path]',
        description: 'Location of log files for node service',
        value: '/var/log/xtuple/{version}/{name}/'
      }
    },

    run: function (options) {
      var xt = options.xt,
        pg = options.pg,
        domain = options.nginx.domain,
        sample_path = path.resolve(xt.srcdir, 'node-datasource/sample_config'),
        config_path = path.resolve(xt.configdir.format({
          version: xt.version,
          name: pg.name
        })),
        config_js = path.resolve(config_path, 'config.js'),
        log_path = path.resolve(xt.logdir.format({
          version: xt.version,
          name: options.pg.name
        })),
        ssl_path = path.resolve(config_path, 'ssl'),
        ssl_crt = path.resolve(ssl_path, domain + '.crt'),
        sample_config = require(sample_path),
        sample_obj = JSON.parse(JSON.stringify(sample_config)),
        output_conf,
        salt;

      _.extend(sample_obj, {
        datasource: _.extend(sample_config.datasource, {
          name: domain,
          keyFile: path.resolve(ssl_path, domain + '.pem'),
          certFile: path.resolve(ssl_path, domain + '.crt'),
          saltFile: path.resolve(config_path, 'salt.txt'),
          hostname: domain,
          port: pg.cluster.port + 3011,
          redirectPort: +pg.cluster.port + 3456,
          databases: options.pg.databases,
          testDatabase: ''
        }),
        databaseServer: {
          hostname: 'localhost',
          user: 'admin',
          port: pg.cluster.port,
          password: options.pg.adminpw
        }
      });

      output_conf = serverconfig.config_template.format({
        json: JSON.stringify(sample_obj, null, 2)
      });

      // ensure path integrity and write config file
      exec('sudo mkdir -p ' + config_path);
      exec('sudo mkdir -p ' + ssl_path);
      exec('sudo mkdir -p ' + log_path);
      fs.writeFileSync(config_js, output_conf);
          

      // write salt file
      salt = exec('cat /dev/urandom | tr -dc \'0-9a-zA-Z!@#$%^&*_+-\' | head -c 64');
      fs.writeFileSync(path.resolve(config_path, 'salt.txt'), salt);

      if (!fs.existsSync(ssl_crt)) {
        require('../nginx/ssl').generate(ssl_path);
      }

      // ensure correct permissions
      exec('sudo chown -R xtuple:xtuple /etc/xtuple');
      exec('sudo chown -R xtuple:xtuple /var/log/xtuple');
      exec('sudo chown -R xtuple:xtuple /usr/local/xtuple');

      // TODO point ssl paths to nginx localhost keys

      return {
        string: output_conf,
        json: sample_obj,
        config_path: config_path,
        config_js: config_js
      };
    }
  });
})();
