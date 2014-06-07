var lib = require('xtuple-server-lib'),
  _ = require('lodash'),
  exec = require('execSync').exec,
  format = require('string-format'),
  fs = require('fs'),
  path = require('path');

/**
 * Configure Authentication Rules for Postgres access.
 *
 * <https://tools.ietf.org/html/rfc1918#section-3>
 * <http://www.postgresql.org/docs/9.3/static/auth-pg-hba-conf.html>
 * <http://www.postgresql.org/docs/9.3/static/auth-methods.html#AUTH-CERT>
 */
_.extend(exports, lib.task, /** @exports hba */ {

  filename_template: 'pg_hba-{pg.version}.conf.template',

  options: {
    cacrt: {
      optional: '[cacrt]',
      description: 'The root CA file for the SSL cert'
    },
    worldlogin: {
      optional: '[boolean]',
      description: 'True if postgres should allow world md5 login; false otherwise',
      value: false
    }
  },

  /** @override */
  beforeTask: function (options) {
    if (!_.isEmpty(options.pg.cacrt)) {
      options.pg.cacrt = path.resolve(options.pg.cacrt);
    }
    else {
      options.pg.cacrt = options.nginx.outcrt;
    }
    options.pg.version = (options.pg.version).toString();
    options.pg.outcacrt = path.resolve(
      '/var/lib/postgresql', options.pg.version, options.pg.cluster.name, 'root.crt'
    );
  },

  /** @override */
  executeTask: function (options) {
    var hba_boilerplate = fs.readFileSync(
        path.resolve(__dirname, exports.filename_template.format(options))
      ),
      hba_target = path.resolve(
        '/etc/postgresql/', options.pg.version, options.pg.cluster.name, 'pg_hba.conf'
      ),
      hba_conf = hba_boilerplate.toString().format(options);

    fs.unlinkSync(hba_target);
    fs.writeFileSync(hba_target, hba_conf);

    exports.createClientCert(options);

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
    // TODO use some openssl npm module instead of calling 'exec'
    exec([
        'openssl req -new -nodes',
        '-keyout {pg.outkey}',
        '-out {xt.ssldir}/{xt.name}.csr',
        '-subj \'/CN={nginx.domain}\''
    ].join(' ').format(options));

    exec([
        'openssl x509 -req -CAcreateserial',
        '-in {xt.ssldir}/{xt.name}.csr',
        '-CAkey {nginx.outkey}',
        '-CA {nginx.outcrt}',
        '-out {pg.outcrt}'
    ].join(' ').format(options));

    // copy the ca cert into the postgres data dir
    exec('cp {pg.cacrt} {pg.outcacrt}'.format(options));

    exec('chown {xt.name}:ssl-cert {pg.outcacrt}'.format(options));
    exec('chown {xt.name}:ssl-cert {pg.outcacrt}'.format(options));
    exec('chown {xt.name}:ssl-cert {pg.outcrt}'.format(options));
    exec('chown {xt.name}:ssl-cert {pg.outkey}'.format(options));
  }
});
