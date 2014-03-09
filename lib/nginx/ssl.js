(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    fs = require('fs'),
    path = require('path');

  var ssl = exports;

  _.extend(ssl, /** @exports ssl */ {
    
    options: {
      'crt': {
        optional: '[file]',
        description: 'Path to SSL certificate (.crt)',
        value: '/srv/ssl/localhost.crt'
      },
      'pem': {
        optional: '[file]',
        description: 'Path to SSL public key (.pem)',
        value: '/srv/ssl/localhost.pem'
      }
    },

    /** @static */
    generate: function (out_path) {
      return exec([
        'sudo -u www-data openssl req',
        '-x509 -newkey rsa:2048',
        '-keyout', path.resolve(out_path, 'localhost.pem'),
        '-out', path.resolve(out_path, 'localhost.crt'),
        '-subj \'/C=US/CN=localhost/O=xTuple\'',
        '-days 10000 -nodes &> /dev/null'
      ].join(' ')).stdout;
    },

    /** @static */
    run: function (options) {
      var nginx = options.nginx,
        installed_crt = '/srv/ssl/{domain}.crt'.format(nginx);

      if (!fs.existsSync(installed_crt) && nginx.domain === 'localhost') {
        ssl.generate('/srv/ssl');
        exec('sudo -u www-data mkdir -p /srv/ssl');
      }

      if (!fs.existsSync(installed_crt)) {
        exec('sudo -u www-data cp {crt} /srv/ssl/{domain}.crt 2&> /dev/null'.format(nginx));
        exec('sudo -u www-data cp {pem} /srv/ssl/{domain}.pem 2&> /dev/null'.format(nginx));
      }

      exec('sudo -u www-data chmod 440 /srv/ssl/{domain}.*'.format(nginx));
      // XXX can't start until nd is setup. exec('sudo service nginx restart');

      return options;
    },

    /** @static */
    rollback: function (options) {

    }
  });
})();
