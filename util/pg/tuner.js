(function () {
  'use strict';

  /**
   * Tuner guidelines influenced by:
   * <http://wiki.postgresql.org/wiki/Tuning_Your_PostgreSQL_Server>
   */

  var line = require('line-conf'),
    format = require('string-template'),
    _ = require('underscore'),
    os = require('os'),
    m = require('mstring'),
    posix = require('posix'),

    MB = 1048576,

    defaults = {
      max_connections: 32
    },
    postgresql_conf = m(function () {
    /***
      data_directory = '{data_directory}'
      hba_file = '/etc/postgresql/{version}/{cluster}/pg_hba.conf' # host-based authentication file
      ident_file = '/etc/postgresql/{version}/{cluster}/pg_ident.conf' # ident configuration file

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
      custom_variable_classes = 'plv8'    # list of custom variable class names
    ***/
    }),

    /**
     * Defines /etc/sysctl.d/30-postgresql-shm.conf
     */
    sysctl_conf = m(function () {
    /***
      kernel.shmmax = {shmmax}
      kernel.shmall = {shmall}
    ***/
    }),
    env = {
      totalmem: os.totalmem() / MB,
      freemem: os.freemem() / MB,
      cpus: os.cpus().length,
      shmmax: (os.totalmem() / 2),
      shmall: ((os.totalmem() / 2) / 4096)
    };

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-SHARED-BUFFERS>
   */
  function shared_buffers (params) {
    var sysctl;
    if (params.version < 9.3) {
      format(sysctl_conf, { shmmax: env.shmmax, shmall: env.shmall });
      // TODO write to file
    }

    return env.totalmem / 4.0;
  }
  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-WORK-MEM>
   */
  function work_mem (params) {
    return 1.0; // MB
  }

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-query.html#GUC-EFFECTIVE-CACHE-SIZE>
   */
  function effective_cache_size (params) {
    return env.totalmem / (params.box ? 2.0 : 1.5);
  }

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-MAX-STACK-DEPTH>
   */
  function max_stack_depth (params) {
    var limit = posix.getrlimit('stack').soft;
    return (7/8) * limit;
  }
  
  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-MAINTENANCE-WORK-MEM>
   */
  function maintenance_work_mem (params) {
    return env.totalmem / 8.0;
  }

  /**
   * <http://www.postgresql.org/docs/current/static/runtime-config-resource.html#GUC-TEMP-BUFFERS>
   */
  function temp_buffers (params) {
    return Math.ceil(env.cpus / 2);
  }

  /**
   * cluster {
   *   version: {version},
   *   name: 'main',
   *   port: 5432,
   *   config: /etc/postgresql/{version}/kelhay,
   *   data: /var/lib/postgresql/{version}/kelhay,
   *   locale: 'en_US.UTF-8'
   * }
   */
  function tune (cluster, params) {

    format(postgresql_conf, _.extend({ }, cluster, {
      locale: cluster.locale,
      data_directory: cluster.data,
      version: cluster.version,
      cluster: cluster.name,
      port: cluster.port,
      max_connections: defaults.max_connections || params.max_connections,
      shared_buffers: shared_buffers(params),
      temp_buffers: temp_buffers(params),
      work_mem: work_mem(params),
      maintenance_work_mem: maintenance_work_mem(params),
      max_stack_depth: max_stack_depth(params),
      effective_cache_size: effective_cache_size(params),
    }));

    // TODO write to file
  }

  exports.tune = tune;
})();
