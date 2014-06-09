var lib = require('xtuple-server-lib'),
  format = require('string-format'),
  _ = require('lodash'),
  fs = require('fs'),
  path = require('path');

/**
 * Compile config vars for postgres setup
 */
_.extend(exports, lib.task, /** @exports config */ {

  defaults: {
    locale: 'en_US.UTF-8',
    max_connections: 64,
    work_mem: 1,
    maintenance_work_mem: 16,
    temp_buffers: 16,
    shared_buffers: 64,
    effective_cache_size: 256,
    max_stack_depth: 4,
    max_locks_per_transaction: 1024
  },

  options: {
    host: {
      optional: '[host]',
      description: 'Postgres server host address',
      value: '/var/run/postgresql'
    },
    version: {
      optional: '[version]',
      description: 'Version of postgres to install',
      value: '9.3'
    },
    locale: {
      optional: '[string]',
      value: 'en_US.UTF-8',
      description: 'Cluster locale'
    },
    timezone: {
      optional: '[integer]',
      description: 'Integer offset from UTC; e.g., "-7" is PDT, "-8" is PST, etc',
      value: 'localtime'
    },
  },

  /** @override */
  executeTask: function (options) {
    exports.writePostgresqlConfig(options);
  },

  /** @override */
  afterTask: function (options) {
    lib.pgCli.ctlcluster(options, 'restart');
  },

  /**
   * Find the existing cluster that corresponds to our options, if it exists,
   * and set options.pg.cluster
   */
  discoverCluster: function (options) {
    options.pg.cluster = _.findWhere(lib.pgCli.lsclusters(), {
      name: lib.util.getClusterName(options),
      version: options.pg.version
    });

    if (!_.isObject(options.pg.cluster)) {
      throw new Error('No such installation exists: ' + lib.util.getClusterName(options));
    }
  },

  /**
   * Write the postgresql.conf file
   */
  writePostgresqlConfig: function (options) {
    _.defaults(options.pg.config, options.pg.cluster, {
      name: lib.util.getClusterName(options),
      timezone: options.pg.timezone,
      data_directory: options.pg.cluster.data,
      ssl_cert_file: options.pg.outcrt,
      ssl_key_file: options.pg.outkey,
      ssl_ca_file: options.pg.outcacrt
    }, exports.defaults);

    var targetPath = path.resolve('/etc/postgresql', options.pg.version, options.pg.cluster.name, 'postgresql.conf'),
      templateFile = path.resolve(__dirname, 'postgresql-{pg.version}.conf.template'.format(options)),
      template = fs.readFileSync(templateFile).toString(),
      conf = template.format(options.pg.config);

    fs.writeFileSync(targetPath, conf);
  }
});
