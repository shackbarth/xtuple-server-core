(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    exec = require('exec-sync');

  var ssl = exports;

  _.extend(ssl, /** @exports ssl */ {
    
    options: {
      'crt': {
        optional: '[file]',
        description: 'Path to SSL certificate (.crt)',
        //value: '/srv/ssl/nginx.crt'
      },
      'key': {
        optional: '[file]',
        description: 'Path to SSL private key (.key)',
        //value: '/srv/ssl/nginx.key'
      },
      'pem': {
        optional: '[file]',
        description: 'Path to SSL public key (.pem)',
        //value: '/srv/ssl/nginx.pem'
      }
    },

    run: function (options) {
      var nginx = options.nginx;

      exec('sudo mkdir -p /srv/ssl');
      nginx.crt && exec('sudo cp {crt} /srv/ssl/{domain}.crt'.format(nginx));
      nginx.pem && exec('sudo cp {pem} /srv/ssl/{domain}.pem'.format(nginx));
      nginx.key && exec('sudo cp {key} /srv/ssl/{domain}.key'.format(nginx));
      if (_.contains(_.keys(nginx), [ 'crt', 'key', 'pem' ])) {
        exec('sudo chmod 400 /srv/ssl/{domain}.*'.format(nginx));
      }

      return options;
    }
  });
})();
