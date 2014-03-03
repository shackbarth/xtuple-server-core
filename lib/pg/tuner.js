(function () {
  'use strict';

  /**
   * Tuning strategies influenced by:
   * <http://pgfoundry.org/projects/pgtune/>
   * <http://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server>
   */

  var format = require('string-format'),
    _ = require('underscore'),
    m = require('mstring'),
    pgctl = require('./ctl'),
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
    tune: function (cluster, config, env) {
      var sysctl_file,
        conf_values = _.extend({ }, cluster, config, {
          params: JSON.stringify({
            cluster: cluster,
            config: config,
            time: new Date().valueOf()
          }),
          data_directory: cluster.data,
          shared_buffers: shared_buffers(cluster, config, env),
          max_stack_depth: max_stack_depth(cluster, config, env),
          effective_cache_size: effective_cache_size(cluster, config, env)
        }),
        postgresql_conf = postgresql_conf_template
          .format(conf_values)
          .replace(/^\s+/mg, '')
          .trim(),
        sysctl_conf;

      // postgres 9.3 claims to handle shared_buffers differently, and thus does
      // not require the altering of SHMMAX
      if (cluster.version < 9.3 && !config.dryrun && config.writeconfig !== false) {
        sysctl_conf = sysctl_conf_template
          .format({ shmmax: config.env.shmmax, shmall: config.env.shmall })
          .replace(/^\s+/mg, '')
          .trim();

        pgctl.write('/etc/sysctl.d/30-postgresql-shm.conf').write(sysctl_conf);
      }

      if (config.writeconfig !== false) {
        pgctl.write_conf(cluster, 'postgresql', postgresql_conf);
      }

      return postgresql_conf;
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
    return Math.ceil((7/8) * env.stacklimit);
  }
})();
