var exec = require('child_process').execSync,
  format = require('string-format'),
  fs = require('fs'),
  path = require('path'),
  _ = require('lodash'),
  os = require('os');

/**
 * Collection of pg CLI utilities
 */
_.extend(exports, /** @exports pg-cli */ {

  parse_rules: {
    'pg_createcluster': {
      keyvalue: true,
      shift: 1
    },
    'pg_lsclusters': {
      header: ['version', 'name', 'port', 'status', 'owner', 'data', 'log'],
      shift: 1
    },
    'pg_hba': {
      header: ['type', 'database', 'user', 'address', 'method']
    }
  },

  /**
   * Run the given query using psql as superuser
   * @public
   * @param query
   */
  psql: function (options, query) {
    var cmd = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/psql',
        '{dbname}',
        '-U {xt.name}',
        '-p {pg.cluster.port}',
        '-c "{query};"'
      ].join(' ').format(_.extend({ query: query }, options)),
      result = exec(cmd).toString();

    log.verbose('pg-cli psql', cmd);
    log.verbose('pg-cli psql', 'result', result);

    return result;
  },

  /**
   * Execute the given sql file through psql.
   * @public
   * @param query
   */
  psqlFile: function (options, file) {
    var cmd = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/psql',
        '{dbname}',
        '-U {xt.name}',
        '-p {pg.cluster.port}',
        '-f {file}'
      ].join(' ').format(_.extend({ file: file }, options)),
      result = exec(cmd).toString();

    log.verbose('pg-cli psql -f', cmd);
    log.verbose('pg-cli psql -f', 'result', result);

    return result;
  },

  /**
   * Restore database from backup file/directory
   * @param filename
   * @param dbname
   */
  restore: function (options) {
    options.pg.jobThreads = Math.max(Math.ceil(os.cpus().length / 2), 4);

    if (/\.sql$/.test(options.filename)) {
      return exports.psqlFile(options, options.filename);
    }

    var cmd = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/pg_restore',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        '-j 1',
        '-d {dbname}',
        '{filename}'
      ].join(' ').format(options),
      result = exec(cmd).toString();

    log.verbose('pg-cli restore', cmd);
    log.verbose('pg-cli restore', 'result', result);

    return result;
  },

  /** @static */
  dump: function (options) {
    options.pg.jobThreads = Math.max(Math.ceil(os.cpus().length / 2), 4);

    var cmd = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/pg_dump',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        '-j {pg.jobThreads}',
        '-f {snapshotpath}',
        '-w -Fd {dbname}'
      ].join(' ').format(options),
      result = exec(cmd).toString();

    log.verbose('pg-cli dump', cmd);
    log.verbose('pg-cli dump', 'result', result);

    return result;
  },
  
  /** @static */
  dumpall: function (options) {
    var cmd = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/pg_dumpall',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        '-f {snapshotpath}',
        '-l {xt.name}',
        '-w -g',
    ].join(' ').format(options),
    result = exec(cmd).toString();

    log.verbose('pg-cli dumpall', cmd);
    log.verbose('pg-cli dumpall', 'result', result);
    
    return result;
  },

  /**
   * Create a new database in a cluster
   * @param owner
   * @param dbname
   */
  createdb: function (options, owner, dbname) {
    var createdb = path.resolve('/usr/lib/postgresql', options.pg.version, 'bin/createdb');
    var cmd = [
        'sudo -u', options.xt.name, createdb,
        dbname,
        '-U', options.xt.name,
        '-O', owner,
        '-p', options.pg.cluster.port
      ].join(' '),
      result = exec(cmd).toString();
    
    log.verbose('pg-cli createdb', cmd);
    log.verbose('pg-cli createdb', 'result', result);

    return result;
  },

  /** @static */
  createcluster: function (options) {
    var cmd = [
        'pg_createcluster',
        options.pg.version,
        options.pg.cluster.name,
        '--user', options.xt.name,
        '--socketdir', options.xt.socketdir,
        (options.pg.port ? '--port ' + options.pg.port : ''),
        '--start'
      ].join(' '),
      result = exec(cmd).toString();

    log.verbose('pg-cli createcluster', cmd);
    log.verbose('pg-cli createcluster', 'result', result);

    if (/Usage:/.test(result.stderr)) {
      log.info('pg-cli createcluster', 'command: %s', cmd);
      throw new Error('pg_createcluster missing arguments');
    }

    return _.extend(
      { version: options.pg.version, name: options.pg.cluster.name },
      exports.parse(result, 'pg_createcluster')
    );
  },

  /** @static */
  lsclusters: function () {
    var result = exec('pg_lsclusters').toString();

    log.verbose('pg-cli lsclusters', 'result', result);

    return _.map(exports.parse(result, 'pg_lsclusters'), function (cluster) {
      return _.defaults({
        config: '/etc/postgresql/{version}/{name}'.format(cluster),
        version: ''+ cluster.version
      }, cluster);
    });
  },

  /** @static */
  ctlcluster: function (options, action) {
    var cmd = [
      'sudo -u '+ options.xt.name,
      'pg_ctlcluster',
      options.pg.version,
      options.pg.cluster.name,
      action,
      '-m fast'
    ].join(' '),
    result = exec(cmd).toString();

    log.verbose('pg-cli ctlcluster', cmd);
    log.verbose('pg-cli ctlcluster', 'result', result);

    return result;
  },

  /** @static */
  dropdb: function (options, owner, dbname) {
    var query = [
      'select pg_terminate_backend(pg_stat_activity.pid)',
        'from pg_stat_activity',
        'where',
          'pg_stat_activity.datname = \'{dbname}\'',
          'and pid <> pg_backend_pid()'
    ].join(' ').format({ dbname: dbname }),
      cmd = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/psql',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        'postgres',
        '-c', '"' + query + ';"',
          '&&',
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/dropdb',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        '{dbname}'
      ].join(' ').format(_.extend({ owner: owner, dbname: dbname }, options)),

    result = exec(cmd).toString();

    return result;
  },

  /** @static */
  dropcluster: function (options) {
    var cmd = [
      'pg_dropcluster',
      options.pg.version,
      options.pg.cluster.name,
      '--stop'
    ].join(' '),
    result = exec(cmd).toString();

    return result;
  },

  /** @static */
  parse: function (result, cmd) {
    var options = exports.parse_rules[cmd],
      matrix = _.compact(_.map((result).trim().split('\n'), function (row) {
        return row.trim() ? row.trim().split(/\s+/) : null;
      })),
      header;

    if (_.isNumber(options.shift)) {
      matrix = _.rest(matrix, options.shift);
    }
    header = _.isArray(options.header) ? options.header : matrix[0];
    
    if (options.keyvalue) {
      return _.object(matrix);
    }
    if (_.isArray(options.header)) {
      header = options.header;
    }
    return _.map(matrix, function (row) {
      return _.object(header, _.map(row, _toNumber));
    });
  }
});

/**
 * @static
 * @private
 */
function _toNumber (str) {
  var f = parseFloat(str), i = parseInt(str, 10);
  if (isNaN(f) || !isFinite(str)) {
    return str;
  }
  return (f !== i) ? f : i;
}
