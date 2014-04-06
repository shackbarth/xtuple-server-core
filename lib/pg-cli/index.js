(function () {
  'use strict';

  /**
   * Collection of pg CLI utilities
   */
  var cli = exports;

  var exec = require('execSync').exec,
    format = require('string-format'),
    _ = require('underscore'),
    os = require('os');

  _.extend(cli, /** @exports cli */ {

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
     * Run the given query using psql as superuser (postgres)
     * @public
     * @param query
     */
    psql: function (options, query) {
      return exec([
        'sudo -u postgres psql',
        '{dbname}',
        '-U postgres',
        '-p {pg.cluster.port}',
        '-c "{query};"'
      ]
      .join(' ')
      .format(_.extend({ query: query }, options)));
    },

    /**
     * Restore database from directory backup
     * @param filename
     * @param dbname
     */
    restore: function (params) {
      var pg_restore = '/usr/lib/postgresql/9.3/bin/pg_restore';

      return exec(pg_restore + ' -j {jobs} -Fd {filename} {dbname}'.format(_.extend({
        jobs: Math.ceil(1, os.cpus().length / 2)
      }, params)));
    },

    dump: function (params) {
      throw new Error('TODO implement');

    },
    
    dumpall: function (params) {
      throw new Error('TODO implement');

    },

    /**
     * Create a new database in a cluster
     * @param owner
     * @param dbname
     */
    createdb: function (params) {
      console.log('createdb');
      console.log(params.pg.cluster);
      return exec([
        'sudo -u postgres createdb',
        '-U postgres',
        '-p {pg.cluster.port}',
        '-O {owner}',
        '{dbname}'
      ]
      .join(' ')
      .format(params));
    },

    /** @static */
    createcluster: function (params) {
      var cmd = 'pg_createcluster {version} {name}'.format(params),
        result = exec(cmd);

      if (/Usage:/.test(result)) {
        throw new Error('pg_createcluster missing arguments');
      }
      if (result.code) {
        throw new Error(result.stdout);
      }

      return _.extend(
        { version: params.version },
        cli.parse(result.stdout, 'pg_createcluster')
      );
    },

    /** @static */
    lsclusters: function () {
      var result = exec('pg_lsclusters');

      if (result.code) {
        throw new Error(result.stdout);
      }

      return _.map(cli.parse(result.stdout, 'pg_lsclusters'), function (cluster) {
        return _.extend({ config: '/etc/postgresql/{version}/{name}'.format(cluster) }, cluster);
      });
    },

    /** @static */
    ctlcluster: function (params) {
      var result = exec('pg_ctlcluster {version} {name} {action}'.format(params));

      if (result.code === 1 || result.code > 2) {
        throw new Error(result.stdout);
      }

      return result.stdout;
    },

    /** @static */
    dropcluster: function (params) {
      var result = exec('pg_dropcluster {version} {name} --stop'.format(params));

      if (result.code) {
        throw new Error(result.stdout);
      }

      return result.stdout;
    },

    /** @static */
    parse: function (result, cmd) {
      var options = cli.parse_rules[cmd],
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

})();
