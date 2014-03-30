(function () {
  'use strict';

  var exec = require('execSync').exec,
    format = require('string-format'),
    _ = require('underscore');

  var cli = exports;

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

      return cli.parse(result.stdout, 'pg_createcluster');
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
