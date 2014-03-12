(function () {
  'use strict';

  /**
   * Tuning strategies influenced by:
   * <http://pgfoundry.org/projects/pgtune/>
   * <http://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server>
   */

  var format = require('string-format'),
    _ = require('underscore'),
    env = require('./defaults').env,
    exec = require('execSync').exec,
    m = require('mstring'),
    fs = require('fs'),
    exec = require('execSync').exec,
    pgctl = require('./ctl'),
    path = require('path'),
    postgresql_conf_template = m(function () {
    /***
      #{params}
      data_directory = '{data_directory}'
      hba_file = '/etc/postgresql/{version}/{name}/pg_hba.conf'
      ident_file = '/etc/postgresql/{version}/{name}/pg_ident.conf'

      listen_addresses = '*'
      superuser_reserved_connections = 1 
      ssl = true
      password_encryption = on
      port = {port}
      max_connections = {max_connections}

      shared_buffers = {shared_buffers}MB
      temp_buffers = {temp_buffers}MB
      work_mem = {work_mem}MB
      maintenance_work_mem = {maintenance_work_mem}MB
      max_stack_depth = {max_stack_depth}MB

      effective_cache_size = {effective_cache_size}MB
      datestyle = 'iso, mdy'
      lc_messages = '{locale}'
      lc_monetary = '{locale}'
      lc_numeric = '{locale}'
      lc_time = '{locale}'

      default_text_search_config = 'pg_catalog.english'
      custom_variable_classes = 'plv8'
    ***/
    }),

    /**
     * Defines /etc/sysctl.d/30-postgresql-shm.conf
     * @see <http://www.postgresql.org/docs/9.3/static/kernel-resources.html>
     */
    sysctl_conf_template = m(function () {
    /***
      kernel.shmmax = {shmmax}
      kernel.shmall = {shmall}
    ***/
    });

  var tuner = exports;

  _.extend(tuner, /** @exports tuner */ {

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
     *   name: 'main',
     *   port: 5432,
     *   config: /etc/postgresql/{version}/kelhay,
     *   data: /var/lib/postgresql/{version}/kelhay,
     *   locale: 'en_US.UTF-8'
     * }
     * config {
     *   ... anything
     *
     * @static
     */
    run: function (options) {
      var pg = options.pg,
        cluster = options.pg.cluster,
        config = options.pg.config,
        conf_values = _.extend({ }, cluster, config, {
          params: JSON.stringify(_.extend({
            generated: new Date().valueOf()
          }, pg)),
          name: options.pg.name,
          data_directory: cluster.data,
          shared_buffers: shared_buffers(cluster, config, env),
          max_stack_depth: max_stack_depth(cluster, config, env),
          effective_cache_size: effective_cache_size(cluster, config, env)
        }),
        postgresql_conf = postgresql_conf_template
          .format(conf_values)
          .replace(/^\s+/mg, '')
          .trim(),
        postgresql_conf_path = path.resolve('/etc/postgresql', pg.version, pg.name, 'postgresql.conf'),
        sysctl_conf_path = path.resolve('/etc/sysctl.d/30-postgresql-shm.conf'),
        sysctl_conf;

      // postgres 9.3 claims to handle shared_buffers differently, and as a
      // result does not require the altering of SHMMAX
      if (pg.version < 9.3) {
        sysctl_conf = sysctl_conf_template
          .format({ shmmax: env.shmmax, shmall: env.shmall })
          .replace(/^\s+/mg, '')
          .trim();

        exec('sysctl -p ' + sysctl_conf_path);
      }

      fs.writeFileSync(sysctl_conf_path, sysctl_conf);
      fs.writeFileSync(postgresql_conf_path, postgresql_conf);

      pgctl.ctlcluster(_.extend({ action: 'reload' }, pg));

      return {
        json: conf_values,
        string: postgresql_conf
      };
    }
  });

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-SHARED-BUFFERS>
   */
  function shared_buffers (cluster, config, env) {
    return Math.ceil(config.ram) * config.slots;
  }

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-query.html#GUC-EFFECTIVE-CACHE-SIZE>
   */
  function effective_cache_size (cluster, config, env) {
    return Math.ceil(config.ram * env.phi) * config.slots;
  }

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-MAX-STACK-DEPTH>
   */
  function max_stack_depth (cluster, config, env) {
    return Math.ceil((7/8) * env.stacklimit) / env.MB;
  }
})();
