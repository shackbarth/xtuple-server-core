var lib = require('xtuple-server-lib'),
  _ = require('lodash'),
  exec = require('sync-exec'),
  cp = require('cp'),
  fs = require('fs'),
  path = require('path');

/**
 * Setup SSL in nginx
 */
_.extend(exports, lib.task, /** @exports xtuple-server-nginx-ssl */ {

  options: {
    incrt: {
      optional: '[file]',
      description: 'Path to SSL certificate (.crt)',
      validate: function (value) {
        if (!_.isEmpty(value) && !fs.existsSync(path.resolve(value))) {
          throw new Error('Invalid path for nginx.incrt: '+ value);
        }

        return value;
      }
    },
    inkey: {
      optional: '[file]',
      description: 'Path to SSL private key (.key)',
      validate: function (value) {
        if (!_.isEmpty(value) && !fs.existsSync(path.resolve(value))) {
          throw new Error('Invalid path for nginx.inkey: '+ value);
        }

        return value;
      }
    }
  },

  /** @override */
  beforeTask: function (options) {
    options.nginx.outcrt = path.resolve(options.xt.ssldir, 'server.crt');
    options.nginx.outkey = path.resolve(options.xt.ssldir, 'server.key');
  },

  /** @override */
  executeTask: function (options) {
    if (!_.isEmpty(options.nginx.incrt) && !_.isEmpty(options.nginx.inkey)) {
      options.nginx.incrt = options.nginx.incrt;
      options.nginx.inkey = options.nginx.inkey;

      cp.sync(options.nginx.incrt, options.nginx.outcrt);
      cp.sync(options.nginx.inkey, options.nginx.outkey);
    }
    else if (/localhost/.test(options.nginx.domain)) {
      var result = exports.generate(options);

      if (result.status !== 0) {
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

    fs.chmodSync(options.nginx.outkey, '600');
    fs.chmodSync(options.nginx.outcrt, '600');
    exec('chown -R '+ options.xt.name + ' ' + options.xt.ssldir);
  },

  /**
   * Generate and write a self-signed SSL keypair.
   * @static
   */
  generate: function (options) {
    var cmd = [
        'sudo -u', options.xt.name,
        'openssl req',
        '-x509 -newkey rsa:2048',
        '-subj \'/CN='+ options.nginx.domain + '\'',
        '-days 365',
        '-nodes',
        '-keyout', options.nginx.outkey,
        '-out', options.nginx.outcrt,
      ].join(' '),
      result = exec(cmd);

    if (result.status !== 0) {
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
    if (exec('openssl x509 -noout -in ' + outcrt).status !== 0) {
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
