(function () {
  'use strict';

  /**
   * Tuning strategies influenced by:
   * <http://pgfoundry.org/projects/pgtune/>
   * <http://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server>
   */
  var tuner = exports;

  var task = require('../sys/task'),
    format = require('string-format'),
    _ = require('underscore'),
    env = require('./defaults').env,
    exec = require('execSync').exec,
    fs = require('fs'),
    path = require('path'),

    sysctl_src_filename = '30-postgresql-shm.conf.template',
    postgresql_src_filename = 'postgresql-{version}.conf.template';

  _.extend(tuner, task, /** @exports tuner */ {

    options: {
      locale: {
        optional: '[string]',
        value: 'en_US.UTF-8',
        description: 'Cluster locale'
      }
    },

    /**
     * @example cluster {
     *   version: {version},
     *   port: 5432,
     *   config: /etc/postgresql/{version}/kelhay,
     *   data: /var/lib/postgresql/{version}/kelhay,
     *   locale: 'en_US.UTF-8'
     * }
     * config {
     *   ... anything
     *
     * @override
     */
    run: function (options) {
      var pg = options.pg,
        cluster = options.pg.cluster,
        config = options.pg.config,
        sysctl_conf_template = fs.readFileSync(
          path.resolve(__dirname, sysctl_src_filename)
        ).toString('ascii'),
        postgresql_conf_template = fs.readFileSync(
          path.resolve(__dirname, postgresql_src_filename.format(pg))
        ).toString('ascii'),
        conf_values = _.extend({ }, cluster, config, {
          params: JSON.stringify(_.extend({
            generated: new Date().valueOf()
          }, pg)),
          name: options.xt.name,
          data_directory: cluster.data,
          shared_buffers: shared_buffers(cluster, config, env),
          max_stack_depth: max_stack_depth(cluster, config, env),
          effective_cache_size: effective_cache_size(cluster, config, env),
          ssl_cert_file: options.nginx.outcrt,
          ssl_key_file: options.nginx.outkey,
          ssl_ca_file: options.nginx.outcrt
        }),
        postgresql_conf = postgresql_conf_template
          .format(conf_values)
          .replace(/^\s+/mg, '')
          .trim(),
        postgresql_conf_path = path.resolve(cluster.config, 'postgresql.conf'),
        sysctl_conf_path = path.resolve('/etc/sysctl.d/30-postgresql-shm.conf'),
        sysctl_conf;

      // postgres 9.3 claims to handle shared_buffers differently, and as a
      // result does not require the altering of SHMMAX
      // XXX pg 9.3 untested in practice
      if ((+pg.version) < 9.3) {
        sysctl_conf = sysctl_conf_template
          .format({ shmmax: env.shmmax, shmall: env.shmall })
          .replace(/^\s+/mg, '')
          .trim();

        fs.writeFileSync(sysctl_conf_path, sysctl_conf);
        exec(['sysctl -p', sysctl_conf_path].join(' '));
      }

      // only 9.2 and above support custom ssl cert paths; < 9.1 must use
      // data_dir/server.crt.
      if ((+pg.version) < 9.2 && pg.host !== 'localhost') {
        throw new Error('Auto-install does not yet support remote Postgres < 9.3 with SSL');
      }

      fs.writeFileSync(postgresql_conf_path, postgresql_conf);

      return {
        path: postgresql_conf_path,
        json: conf_values,
        string: postgresql_conf
      };
    }
  });

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-SHARED-BUFFERS>
   */
  function shared_buffers (cluster, config, env) {
    return Math.ceil(config.shared_buffers) * config.slots;
  }

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-query.html#GUC-EFFECTIVE-CACHE-SIZE>
   */
  function effective_cache_size (cluster, config, env) {
    return Math.ceil(shared_buffers(cluster, config, env) * env.phi);
  }

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-MAX-STACK-DEPTH>
   */
  function max_stack_depth (cluster, config, env) {
    return Math.ceil((7/8) * env.stacklimit) / env.MB;
  }
})();
