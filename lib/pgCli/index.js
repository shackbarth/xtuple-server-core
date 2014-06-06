var exec = require('execSync').exec,
  format = require('string-format'),
  fs = require('fs'),
  _ = require('lodash'),
  os = require('os');


/**
 * Collection of pg CLI utilities
 */
_.extend(exports, /** @exports cli */ {

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
      result = exec(cmd);

    if (result.code !== 0) {
      throw new Error('psql query failed: '+ result.stdout);
    }

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
      result = exec(cmd);

    if (result.code !== 0) {
      throw new Error('psql query failed: '+ cmd.stdout);
    }

    return result;
  },

  /**
   * Restore database from backup file/directory
   * @param filename
   * @param dbname
   */
  restore: function (options) {
    options.pg.jobThreads = Math.ceil(os.cpus().length / 2);

    exports.createdb(options, options.xt.name, options.dbname);

    if (/\.sql$/.test(options.filename)) {
      return exports.psqlFile(options, options.filename);
    }

    var pg_restore = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/pg_restore',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        '-j {pg.jobThreads}',
        '-d {dbname}',
        '{filename}'
      ].join(' ').format(options),
      result = exec(pg_restore);

    if (result.code !== 0 && !/WARNING: errors ignored on restore: /.test(result.stdout)) {
      throw new Error(result.stdout);
    }

    return result;
  },

  /** @static */
  dump: function (options) {
    options.pg.jobThreads = Math.ceil(os.cpus().length / 2);

    var pg_dump = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/pg_dump',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        '-j {pg.jobThreads}',
        '-f {snapshotpath}',
        '-w -Fd {dbname}'
      ].join(' ').format(options),
      result = exec(pg_dump);

    if (result.code) {
      throw new Error(JSON.stringify(result));
    }
    return result;
  },
  
  /** @static */
  dumpall: function (options) {
    var pg_dumpall = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/pg_dumpall',
        '-U {xt.name}',
        '-h {pg.host}',
        '-p {pg.cluster.port}',
        '-f {snapshotpath}',
        '-l {xt.name}',
        '-w -g',
    ].join(' ').format(options),
    result = exec(pg_dumpall);
    
    if (result.code) {
      throw new Error(JSON.stringify(result));
    }
    return result;
  },

  /**
   * Create a new database in a cluster
   * @param owner
   * @param dbname
   */
  createdb: function (options, owner, dbname) {
    var cmd = [
        'sudo -u {xt.name} /usr/lib/postgresql/{pg.version}/bin/createdb',
        '{dbname}',
        '-U {xt.name}',
        '-O {owner}',
        '-p {pg.cluster.port}'
      ].join(' ').format(_.extend({ owner: owner, dbname: dbname }, options)),
      result = exec(cmd);

    return result;
  },

  /** @static */
  createcluster: function (options) {
    var cmd = [
        'pg_createcluster',
        options.pg.version,
        options.pg.cluster.name,
        '--user ' + options.xt.name,
        '--socketdir /var/run/postgresql',
        '--start'
      ].join(' '),
      result = exec(cmd);

    if (/Usage:/.test(result)) {
      throw new Error('pg_createcluster missing arguments');
    }
    if (result.code) {
      throw new Error(JSON.stringify({ cmd: cmd, stdout: result.stdout }));
    }

    return _.extend(
      { version: options.pg.version, name: options.pg.cluster.name },
      exports.parse(result.stdout, 'pg_createcluster')
    );
  },

  /** @static */
  lsclusters: function () {
    var result = exec('pg_lsclusters');

    if (result.code !== 0) {
      throw new Error(result.stdout);
    }

    return _.map(exports.parse(result.stdout, 'pg_lsclusters'), function (cluster) {
      return _.defaults({
        config: '/etc/postgresql/{version}/{name}'.format(cluster),
        version: ''+ cluster.version
      }, cluster);
    });
  },

  /** @static */
  ctlcluster: function (options, action) {
    var result = exec([
      'sudo -u '+ options.xt.name,
      'pg_ctlcluster',
      options.pg.version,
      options.pg.cluster.name,
      action,
      '-m fast'
    ].join(' '));

    if (result.code === 1 || result.code > 2) {
      // FIXME this looks weird. I should have documented why only the
      // error codes 0 and 2 are ok
      throw new Error(result.stdout);
    }

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

    result = exec(cmd);

    console.log(cmd);

    if (result.code) {
      throw new Error(JSON.stringify(result));
    }
    return result;
  },

  /** @static */
  dropcluster: function (options) {
    var result = exec('pg_dropcluster {pg.version} {pg.cluster.name} --stop'.format(options));

    if (result.code !== 0) {
      throw new Error(result.stdout);
    }

    return result;
  },

  /** @static */
  parse: function (result, cmd) {
    var options = exports.parse_rules[cmd],
      matrix = _.compact(_.map((result || '').trim().split('\n'), function (row) {
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
