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
        value: '/srv/ssl/{domain}.crt'
      },
      'key': {
        optional: '[file]',
        description: 'Path to SSL public key (.key)',
        value: '/srv/ssl/{domain}.key'
      }
    },

    /** @static */
    generate: function (out_path, domain) {
      return exec([
        'sudo openssl req',
        '-x509 -newkey rsa:2048',
        '-keyout', path.resolve(out_path, domain + '.key'),
        '-out', path.resolve(out_path, domain + '.crt'),
        '-subj \'/C=US/CN=localhost/O=xTuple\'',
        '-days 10000 -nodes &> /dev/null'
      ].join(' ')).stdout;
    },

    /** @static */
    run: function (options) {
      var nginx = options.nginx,
        installed_crt = '/srv/ssl/{domain}.crt'.format(nginx);

      if (!fs.existsSync(installed_crt) && /localhost/.test(nginx.domain)) {
        exec('sudo mkdir -p /srv/ssl');
        ssl.generate('/srv/ssl', nginx.domain);
      }

      if (!fs.existsSync(installed_crt)) {
        exec('sudo cp {crt} /srv/ssl/{domain}.crt 2&> /dev/null'.format(nginx));
        exec('sudo cp {key} /srv/ssl/{domain}.key 2&> /dev/null'.format(nginx));
      }

      exec('sudo chown -R www-data /srv/ssl');
      exec('sudo chmod o-rwx /srv/ssl/{domain}.*'.format(nginx));

      return options;
    },

    /** @static */
    rollback: function (options) {

    }
  });
})();
