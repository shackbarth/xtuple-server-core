(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    exec = require('execSync').exec,
    _ = require('underscore'),
    m = require('mstring');

  var serverconfig = exports;

  _.extend(serverconfig, /** @exports serverconfig */ {

    config_template: m(function () {
      /***
      // {params}
      (function () {
        'use strict';

        module.exports = {json};

      })();

      ***/
    }),

    options: {
      appdir: {
        required: '<path>',
        description: 'Path to the xtuple application directory'
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
        sample_path = path.resolve(xt.appdir, 'node-datasource/sample_config'),
        config_path = path.resolve('/etc/xtuple', xt.version, pg.name),
        state_path = path.resolve('/var/lib/xtuple'),
        config_js = path.resolve(config_path, 'config.js'),
        log_path = path.resolve(xt.logdir.format({
          version: xt.version,
          name: options.pg.name
        })),
        encryption_key_path = path.resolve(config_path, 'encryption_key.txt'),
        ssl_path = path.resolve(config_path, 'ssl'),
        ssl_crt = path.resolve(ssl_path, domain + '.crt'),
        sample_config = require(sample_path),
        sample_obj = JSON.parse(JSON.stringify(sample_config)),

        // replace default config.js values
        derived_config_obj = _.extend(sample_obj, {
          processName: 'xt-node-' + domain,
          datasource: _.extend(sample_config.datasource, {
            name: domain,
            keyFile: path.resolve(ssl_path, domain + '.key'),
            certFile: path.resolve(ssl_path, domain + '.crt'),
            saltFile: path.resolve(config_path, 'salt.txt'),
            encryptionKeyFile: encryption_key_path,
            hostname: domain,
            description: 'xTuple Node.js',
            port: parseInt(pg.cluster.port) + 3011,          // XXX #refactor magic
            redirectPort: parseInt(pg.cluster.port) + 3456,  // XXX #refactor magic
            databases: _.pluck(xt.database.list, 'flavor'),
            testDatabase: 'demo',
          /*
            (_.find(xt.database.list, function (db) {
              return _.any([
                /masterref/.test(db.flavor),
                /demo/.test(db.flavor),
                /pilot/.test(db.flavor)
              ]);
            }) || { }).flavor || ''
          */
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

      // ensure path integrity and write config file
      exec('mkdir -p ' + config_path);
      exec('mkdir -p ' + log_path);
      exec('mkdir -p ' + state_path);
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
      exec('chown -R xtuple /etc/xtuple');
      exec('chown -R xtuple /var/log/xtuple');
      exec('chown -R xtuple /var/lib/xtuple');
      exec('chown -R xtuple /usr/local/xtuple');

      exec('sudo -u xtuple chmod -R +r    /etc/xtuple');
      exec('sudo -u xtuple chmod -R +rw   /var/log/xtuple');
      exec('sudo -u xtuple chmod -R +rw   /var/lib/xtuple');
      exec('sudo -u xtuple chmod -R +rwx  /usr/local/xtuple');

      // non-xtuple users have basically zero access to any of this stuff
      //exec('sudo -u xtuple chmod -R o-rwx /etc/xtuple');
      //exec('sudo -u xtuple chmod -R o-rwx /var/log/xtuple');
      //exec('sudo -u xtuple chmod -R o-rwx /usr/local/xtuple');

      return {
        string: output_conf,
        json: sample_obj,
        config_path: config_path,
        config_js: config_js,
        log_path: log_path
      };
    }
  });
})();
