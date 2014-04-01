(function () {
  'use strict';

  /**
   * Setup SSL in nginx
   */
  var ssl = exports;

  var format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    fs = require('fs'),
    Zip = require('adm-zip'),
    path = require('path');

  _.extend(ssl, /** @exports ssl */ {
    
    options: {
      'inzip': {
        optional: '[file]',
        description: 'Path to SSL trust chain archive'
      },
      'incrt': {
        optional: '[file]',
        description: 'Path to SSL certificate (.crt)',
        value: '/srv/ssl/localhost.crt'
      },
      'inkey': {
        optional: '[file]',
        description: 'Path to SSL private key (.key)',
        value: '/srv/ssl/localhost.key'
      }
    },

    /**
     * Store the certificate basename in the options map.
     * @override
     */
    prelude: function (options) {
      var chain = path.resolve(options.nginx.inzip);
      if (_.isString(chain)) {
        options.nginx.incrt = ssl.createBundle(chain);
      }
      else {
        options.nginx.incrt = path.resolve(options.nginx.incrt);
      }
      options.nginx.inkey = path.resolve(options.nginx.inkey);

      options.nginx.outcrt = path.resolve(ssl.getCertBasename(options) + '.crt');
      options.nginx.outkey = path.resolve(ssl.getCertBasename(options) + '.key');
    },

    /** @override */
    run: function (options) {
      var nginx = options.nginx;

      exec('mkdir -p /srv/ssl');
      if (!fs.existsSync(nginx.outcrt) && /localhost/.test(nginx.domain)) {
        ssl.generate('/srv/ssl', nginx.domain);
      }

      if (!fs.existsSync(nginx.outcrt)) {
        exec('cp {incrt} {outcrt}'.format(nginx));
        exec('cp {inkey} {outkey}'.format(nginx));
      }

      exec('chown -R www-data /srv/ssl');
      exec('chmod o-rwx /srv/ssl/{domain}.*'.format(nginx));

      return options;
    },

    /**
     * Return basename of SSL cert
     * "basename" = <http://nodejs.org/api/path.html#path_path_basename_p_ext>
     * @public
     */
    getCertBasename: function (options) {
      return path.resolve('/srv/ssl/', options.nginx.domain);
    },

    /**
     * Generate a self-signed SSL keypair in 'out_path'
     * @static
     */
    generate: function (out_path, domain) {
      return exec([
        'openssl req',
        '-x509 -newkey rsa:2048',
        '-keyout', path.resolve(out_path, domain + '.key'),
        '-out', path.resolve(out_path, domain + '.crt'),
        '-subj \'/C=US/CN='+ domain + '/O=xTuple\'',
        '-days 10000 -nodes'
      ].join(' ')).stdout;
    },

    /**
     * Create a .crt bundle from a Comodo zip archive
     */
    createBundle: function (options) {
      var inzip = new Zip(path.resolve(options.nginx.inzip)),
        inkey = path.resolve(options.nginx.inkey),
        inkey_path = path.resolve(path.dirname(inkey)),
        inkey_basename = path.basename(inkey, path.extname(inkey)),
        entries = inzip.getEntries(),
        sort = function (entry) {
          return {
            'PositiveSSLCA2.crt': 1,
            'AddTrustExternalCARoot.crt': 2
          }[entry.entryName] || 0;
        },

        // cat mydomain.crt PositiveSSLCA2.crt AddTrustExternalCARoot.crt >> sslbundle.crt
        bundleStr = _.reduce(_.sortBy(entries, sort), function (memo, entry) {
          return memo + inzip.readAsText(entry);
        }, ''),
        bundlePath = path.resolve(inkey_path, inkey_basename + '.crt');

      // TODO switch to camelcase. I don't know what it is about writing sysadmin
      // scripts that makes me want to use underscores everywhere
      fs.writeFileSync(bundlePath, bundleStr);

      return true;
    },

    /**
     * Perform two-factor verification of the provided SSL files:
     * 1. verify the x509-ness of the incrt
     * 2. check crt/key modulus equality
     *
     * @param options.nginx.inkey
     * @param options.nginx.incrt
     * @return true if both of these conditions hold
     */
    verifyCertificate: function (options) {
      var inkey = path.resolve(options.nginx.inkey),
        incrt = path.resolve(options.nginx.incrt);

      if (!fs.existsSync(incrt)) {
        throw new Error('Provided .crt file does not exist');
      }
      if (!fs.existsSync(inkey)) {
        throw new Error('Provided .key file does not exist');
      }

      // verify x509 certificate
      if (exec('openssl x509 -noout -in ' + incrt).code !== 0) {
        throw new Error('The provided .crt failed openssl x509 verify');
      }

      var key_modulus = exec('openssl rsa -noout -modulus -in '+ inkey).stdout,
        crt_modulus = exec('openssl x509 -noout -modulus -in '+ incrt).stdout;

      // perform modulus check
      if (key_modulus !==/*======*/ crt_modulus) {  // much equal. very modulus.
        throw new Error(
          'crt/key moduli inconsistent; ' +
          'basically, the .crt was not created from the .key'
        );
      }

      return true;
    }
  });
})();
