(function () {
  'use strict';

  var exec = require('exec-sync'),
    format = require('string-format'),
    _ = require('underscore');

  var ctl = exports;

  _.extend(ctl, /** @exports ctl */ {

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

      if (/cluster configuration already exists/.test(result)) {
        throw new Error('pg cluster already exists');
      }
      if (/Usage:/.test(result)) {
        throw new Error('pg_createcluster missing arguments');
      }
      if (!result) {
        throw new Error('unknown error in pg_createcluster');
      }

      return ctl.parse(result, 'pg_createcluster');
    },

    /** @static */
    lsclusters: function () {
      var result = exec('pg_lsclusters');

      return _.map(ctl.parse(result, 'pg_lsclusters'), function (cluster) {
        return _.extend({ config: '/etc/postgresql/{version}/{name}'.format(cluster) }, cluster);
      });
    },

    /** @static */
    ctlcluster: function (params) {
      return exec('pg_ctlcluster {version} {name} {action}'.format(params));
    },

    /** @static */
    dropcluster: function (params) {
      return exec('pg_dropcluster {version} {name}'.format(params));
    },

    /** @static */
    parse: function (result, cmd) {
      var options = ctl.parse_rules[cmd],
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
