(function () {
  'use strict';

  /**
   * Setup SSL in nginx
   */
  var ssl = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    _ = require('lodash'),
    exec = require('execSync').exec,
    fs = require('fs'),
    Zip = require('adm-zip'),
    path = require('path');

  _.extend(ssl, task, /** @exports ssl */ {

    options: {
      'inzip': {
        optional: '[file]',
        description: 'Path to SSL trust chain archive'
      },
      'incrt': {
        optional: '[file]',
        description: 'Path to SSL certificate (.crt)'
      },
      'inkey': {
        optional: '[file]',
        description: 'Path to SSL private key (.key)'
      }
    },

    /** @override */
    beforeTask: function (options) {
      var nginx = options.nginx;

      nginx.outcrt = path.resolve(options.xt.ssldir, 'server.crt');
      nginx.outkey = path.resolve(options.xt.ssldir, 'server.key');
    },

    /** @override */
    executeTask: function (options) {
      var nginx = options.nginx;
      if (_.isString(nginx.inzip) && _.isString(nginx.inkey)) {
        nginx.inzip = path.resolve(nginx.inzip);
        ssl.createBundle(options);
      }
      else if (_.isString(nginx.incrt) && _.isString(nginx.inkey)) {
        nginx.incrt = path.resolve(nginx.incrt);
        nginx.inkey = path.resolve(nginx.inkey);

        if (!fs.existsSync(nginx.incrt)) {
          throw new Error('nginx.incrt was specified, but I cannot find file: '+ nginx.incrt);
        }
        if (!fs.existsSync(nginx.inkey)) {
          throw new Error('nginx.inkey was specified, but I cannot find file: '+ nginx.inkey);
        }

        exec('cp {nginx.incrt} {nginx.outcrt}'.format(options));
        exec('cp {nginx.inkey} {nginx.outkey}'.format(options));
      }
      else if (/localhost/.test(nginx.domain)) {
        var result = ssl.generate(options);

        if (result.code !== 0) {
          throw new Error(JSON.stringify(result, null, 2));
        }
      }
      else {
        throw new Error([
          'SSL missing required info.',
          'Either a key is missing for a non-localhost domain,',
          'or one of inkey/incrt/inzip is invalid or missing'
        ].join('\n'));
      }
    },

    /** @override */
    afterTask: function (options) {
      ssl.verifyCertificate(options);

      exec('chown {xt.name}:ssl-cert {nginx.outcrt}'.format(options));
      exec('chown {xt.name}:ssl-cert {nginx.outkey}'.format(options));
    },

    /**
     * Generate and write a self-signed SSL keypair.
     * @static
     */
    generate: function (options) {
      var cmd = [
          'openssl req',
          '-x509 -newkey rsa:2048',
          '-subj \'/CN='+ options.nginx.domain + '\'',
          '-days 365',
          '-nodes',
          '-keyout {nginx.outkey}',
          '-out {nginx.outcrt}',
        ].join(' ').format(options),
        result = exec(cmd);

      if (result.code !== 0) {
        console.log(JSON.stringify(options, null, 2));
        throw new Error('could not generate keypair: '+ result.stdout);
      }

      return result;
    },

    /**
     * Create a .crt bundle from a Comodo zip archive
     */
    createBundle: function (options) {
      var inzip = new Zip(options.nginx.inzip),
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
        }, '');

      // TODO switch to camelcase. I don't know what it is about writing sysadmin
      // scripts that makes me want to use lodashs everywhere
      fs.writeFileSync(options.nginx.outcrt, bundleStr);
      exec('cp {nginx.inkey} {nginx.outkey}'.format(options));
    },

    /**
     * Perform two-factor verification of the provided SSL files:
     * 1. verify the x509-ness of the outcrt
     * 2. check crt/key modulus equality
     *
     * @param options.nginx.outkey
     * @param options.nginx.outcrt
     * @return true if both of these conditions hold
     */
    verifyCertificate: function (options) {
      var outkey = path.resolve(options.nginx.outkey),
        outcrt = path.resolve(options.nginx.outcrt);

      if (!fs.existsSync(outcrt)) {
        throw new Error('Provided .crt file does not exist: '+ outcrt);
      }
      if (!fs.existsSync(outkey)) {
        throw new Error('Provided .key file does not exist: '+ outkey);
      }

      // verify x509 certificate
      if (exec('openssl x509 -noout -in ' + outcrt).code !== 0) {
        throw new Error('The provided .crt failed openssl x509 verify');
      }

      var key_modulus = exec('openssl rsa -noout -modulus -in '+ outkey).stdout,
        crt_modulus = exec('openssl x509 -noout -modulus -in '+ outcrt).stdout;

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
