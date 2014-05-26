var task = require('../../lib/task'),
  format = require('string-format'),
  _ = require('lodash'),
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path');

/**
 * Setup SSL in nginx
 */
_.extend(exports, task, /** @exports ssl */ {
  options: {
    'incrt': {
      optional: '[file]',
      description: 'Path to SSL certificate (.crt)',
      validate: function (arg) {
        if (!fs.existsSync(path.resolve(arg))) {
          throw new Error('Invalid path for nginx.incrt: '+ arg);
        }

        return true;
      }
    },
    'inkey': {
      optional: '[file]',
      description: 'Path to SSL private key (.key)',
      validate: function (arg) {
        if (!fs.existsSync(path.resolve(arg))) {
          throw new Error('Invalid path for nginx.inkey: '+ arg);
        }

        return true;
      }
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
    if (!_.isEmpty(nginx.incrt) && !_.isEmpty(nginx.inkey)) {
      nginx.incrt = path.resolve(nginx.incrt);
      nginx.inkey = path.resolve(nginx.inkey);

      exec('cp {nginx.incrt} {nginx.outcrt}'.format(options));
      exec('cp {nginx.inkey} {nginx.outkey}'.format(options));
    }
    else if (/localhost/.test(nginx.domain)) {
      var result = exports.generate(options);

      if (result.code !== 0) {
        throw new Error(JSON.stringify(result, null, 2));
      }
    }
    else {
      throw new Error([
        'SSL missing required info.',
        'Either a key is missing for a non-localhost domain,',
        'or one of inkey/incrt is invalid or missing'
      ].join('\n'));
    }
  },

  /** @override */
  afterTask: function (options) {
    exports.verifyCertificate(options);

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
