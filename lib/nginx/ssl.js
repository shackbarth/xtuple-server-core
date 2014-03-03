(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    exec = require('exec-sync');

  var ssl = exports;

  _.extend(ssl, /** @exports ssl */ {
    
    options: {
      'ssl-cert': {
        optional: '[file]',
        description: 'Path to SSL certificate (.crt)',
        value: '/srv/ssl/nginx.crt'
      },
      'ssl-key': {
        optional: '[file]',
        description: 'Path to SSL private key (.key)',
        value: '/srv/ssl/nginx.key'
      },
      'ssl-pem': {
        optional: '[file]',
        description: 'Path to SSL public key (.pem)',
        value: '/srv/ssl/nginx.pem'
      }
    },

    run: function (options) {
      options.crt && exec('cp {crt} /srv/ssl/{ssldomain}.crt'.format(options));
      options.pem && exec('cp {pem} /srv/ssl/{ssldomain}.pem'.format(options));
      options.key && exec('cp {key} /srv/ssl/{ssldomain}.key'.format(options));
      exec('chmod 400 /srv/ssl/{ssldomain}.*'.format(options));
    }
  });

})();
