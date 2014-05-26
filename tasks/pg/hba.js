var lib = require('../../lib'),
  _ = require('lodash'),
  fs = require('fs'),
  path = require('path'),
  exec = require('execSync').exec,
  format = require('string-format'),
  filename_template = 'pg_hba-{pg.version}.conf.template';

/**
 * Configure Authentication Rules for Postgres access.
 *
 * <https://tools.ietf.org/html/rfc1918#section-3>
 * <http://www.postgresql.org/docs/9.3/static/auth-pg-hba-conf.html>
 * <http://www.postgresql.org/docs/9.3/static/auth-methods.html#AUTH-CERT>
 */
_.extend(exports, lib.task, /** @exports hba */ {
  options: {
    cacrt: {
      optional: '[cacrt]',
      description: 'The root CA file for the SSL cert'
    }
  },

  /** @override */
  beforeTask: function (options) {
    exec('usermod -a -G www-data postgres');
    exec('usermod -a -G ssl-cert postgres');

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
    options.pg.hba.world = (options.sys.mode === 'cloud') ? '' : '#';
  },

  /** @override */
  executeTask: function (options) {
    var hba_boilerplate = fs.readFileSync(
        path.resolve(__dirname, filename_template.format(options))
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
    exec('chmod -R g=rx,u=wrx,o-rwx {xt.ssldir}'.format(options));
  }
});
