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

  var task = require('../../lib/task'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    exec = require('execSync').exec,
    format = require('string-format'),
    filename_template = 'pg_hba-{version}.conf.template',
    xtuple_hba_entries = [

      '# xTuple HBA Entries (auto-generated)',
      '# ===================================================',

      'local      all             all                                     trust',

      '# allow "xtdaemon" user access from anywhere, but require matching ssl',
      '# cert for this privilege to even be considered.',
      '{xtdaemon_ssl}hostssl    all             xtdaemon        0.0.0.0/0               cert clientcert=1',

      '# internal network (rfc1918)',
      'hostssl    all             all             10.0.0.0/8              md5',
      'hostssl    all             all             172.16.0.0/12           md5',
      'hostssl    all             all             192.168.0.0/16          md5',

      '# xtuple\'s network (for remote maintenance)',
      'hostssl    all             all             .xtuple.com             md5',
      'hostssl    all             all             184.179.17.0/24         md5',

      '# world',
      '#hostssl   all             all             0.0.0.0/0               md5'

    ];
  
  _.extend(hba, task, /** @exports hba */ {

    /** @override */
    beforeTask: function (options) {
      options.pg.version = (options.pg.version).toString();
      exec('usermod -a -G www-data postgres');
    },

    /** @override */
    doTask: function (options) {
      var pg = options.pg,
        xt = options.xt,
        hba_src = fs.readFileSync(path.resolve(__dirname, filename_template.format(pg))),
        hba_target = path.resolve('/etc/postgresql/', pg.version, xt.name, 'pg_hba.conf'),
        hba_extant = fs.readFileSync(hba_target).toString(),
        hba_conf = hba_extant.split('\n').concat(xtuple_hba_entries).join('\n').format({
          xtdaemon_ssl: (pg.host === 'localhost') ? '#' : ''
        });

      fs.writeFileSync(hba_target, hba_conf);
  
      options.pg.hba = { path: hba_target, string: hba_conf };
    },

    /**
     * Sign a new client cert against the provided one for this domain.
     */
    createClientCert: function (options) {
      exec('mkdir -p {xt.configdir}/ssl'.format(options));

      // create a client key and a signing request against the installed domain
      // cert
      return {
        csr: exec([
          'openssl req -new -nodes',
          '-keyout xtdaemon.key',
          '-out xtdaemon.csr',
          '-subj \'O=xTuple/OU=postgres/CN=xtdaemon\''
        ].join(' ')),

        crt: exec([
          'openssl x509 -req -CAcreateserial',
          '-in xtdaemon.csr',
          '-CAkey {outkey}'.format(options.nginx),
          '-CA {outcrt}.crt'.format(options.nginx),
          '-out xtdaemon.crt'
        ].join(' '))
      };
    },

    /** @override */
    afterTask: function (options) {
      // verify xtdaemon ssl client cert
      var verified = exec([
        'openssl verify',
        '-CAfile root.crt',
        '-purpose sslclient',
        'client.crt'
      ].join(' '));

      if (verified !== 0) {
        throw new Error('Failed to verify client certificate for xtdaemon');
      }

      exec('chown -R postgres:postgres /etc/postgresql');
    }
  });

})();
