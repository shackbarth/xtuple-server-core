(function () {
  'use strict';

  /**
   * Configure Authentication Rules for Postgres access.
   *
   * <https://tools.ietf.org/html/rfc1918#section-3>
   * <http://www.postgresql.org/docs/9.3/static/auth-pg-hba-conf.html>
   * <http://www.postgresql.org/docs/9.3/static/auth-methods.html#AUTH-CERT>
   */
  var hba = exports;

  var lib = require('../../lib'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    exec = require('execSync').exec,
    format = require('string-format'),
    filename_template = 'pg_hba-{pg.version}.conf.template',
    xtuple_hba_entries = [

      '# xTuple HBA Entries (auto-generated)',
      '# ===================================================',

    //  'local      all             all                                     trust',

      '# internal networks (rfc1918); don\'t require ssl',
      'host       all             all             10.0.0.0/8              md5',
      'host       all             all             172.16.0.0/12           md5',
      'host       all             all             192.168.0.0/16          md5',

      '# xtuple\'s network (for remote maintenance)',
      '#hostssl    all             all             .xtuple.com             md5',
      'hostssl    all             all             184.179.17.0/24         md5',

      '# allow "{xt.name}" user access from anywhere, but require matching ssl',
      '# cert for this privilege to even be considered.',
      '# hostssl    all             {xt.name}       0.0.0.0/0               cert clientcert=1',

      '# world',
      '#hostssl   all             all             0.0.0.0/0               md5'
    ];
  
  _.extend(hba, lib.task, /** @exports hba */ {

    options: {
      cacrt: {
        name: '[cacrt]',
        description: 'The root CA file for the SSL cert'
      }
    },

    beforeInstall: function (options) {
      if (_.isString(options.pg.cacrt)) {
        options.pg.cacrt = path.resolve(options.pg.cacrt);
      }
      options.pg.version = (options.pg.version).toString();
      options.pg.outcacrt = path.resolve('/var/lib/postgresql', options.pg.version, options.xt.name, 'root.crt');
    },

    /** @override */
    beforeTask: function (options) {
      exec('usermod -a -G www-data postgres');
      exec('usermod -a -G ssl-cert postgres');
    },

    /** @override */
    doTask: function (options) {
      var hba_boilerplate = fs.readFileSync(
          path.resolve(__dirname, filename_template.format(options))
        ),
        hba_target = path.resolve('/etc/postgresql/', options.pg.version, options.xt.name, 'pg_hba.conf'),
        hba_conf = hba_boilerplate.toString()
          .split('\n')
          .concat(xtuple_hba_entries)
          .join('\n')
          .format(options);

      fs.unlinkSync(hba_target);
      fs.writeFileSync(hba_target, hba_conf);

      hba.createClientCert(options);

      _.extend(options.pg.hba, { path: hba_target, string: hba_conf });
    },

    /**
     * Sign a new client cert against the provided one for this domain.
     */
    createClientCert: function (options) {
      options.pg.outcrt = path.resolve(options.xt.ssldir, options.xt.name + '.crt');
      options.pg.outkey = path.resolve(options.xt.ssldir, options.xt.name + '.key');

      // create a client key and a signing request against the installed domain
      // cert
      var commands = [
          [
            'openssl req -new -nodes',
            '-keyout {pg.outkey}',
            '-out {xt.ssldir}/{xt.name}.csr',
            '-subj \'/CN={nginx.domain}\''
          ].join(' ').format(options),

          [
            'openssl x509 -req -CAcreateserial',
            '-in {xt.ssldir}/{xt.name}.csr',
            '-CAkey {nginx.outkey}',
            '-CA {nginx.outcrt}',
            '-out {pg.outcrt}'
          ].join(' ').format(options),

          [
            'openssl verify',
            '-CAfile {nginx.outcrt}',
            '-purpose sslclient',
            '{pg.outcrt}'
          ].join(' ').format(options),
        ],
        results = _.map(commands, exec),
        failed = _.difference(results, _.where(results, { code: 0 }));

      // copy the ca cert into the postgres data dir
      if (_.isString(options.pg.outcacrt)) {
        exec('cp {pg.cacrt} {pg.outcacrt}'.format(options));
      }

      if (failed.length > 0) {
        throw new Error(JSON.stringify(failed, null, 2));
      }
      // exec('chown {xt.name}:ssl-cert {pg.cacrt}'.format(options));
      exec('chown {xt.name}:ssl-cert {pg.outcrt}'.format(options));
      exec('chown {xt.name}:ssl-cert {pg.outkey}'.format(options));
      exec('chmod -R g=rx,u=wrx,o-rwx {xt.ssldir}'.format(options));
    }
  });
})();
