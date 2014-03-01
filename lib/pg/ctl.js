(function () {
  'use strict';

  var execSync = require('exec-sync'),
    format = require('string-format'),
    Writer = require('simple-file-writer'),
    _ = require('underscore');

  var ctl = exports;

  _.extend(ctl, /** @exports pg.ctl */ {

    /** @static */
    createcluster: function (params) {
      var cmd = 'pg_createcluster {version} {name}'.format(params),
        result = ctl._exec(cmd);

      return ctl._parse(result, { keyvalue: true, shift: 1 });
    },

    /** @static */
    lsclusters: function () {
      var header = ['version', 'name', 'port', 'status', 'owner', 'data', 'log'],
        result = ctl._exec('pg_lsclusters');

      return _.map(ctl._parse(result, { header: header, shift: 1 }), function (cluster) {
        return _.extend({ config: '/etc/postgresql/{version}/{name}'.format(cluster) }, cluster);
      });
    },

    /** @static */
    ctlcluster: function (params) {
      return ctl._exec('pg_ctlcluster {version} {name} {action}'.format(params));
    },

    /** @static */
    dropcluster: function (params) {
      return ctl._exec('pg_dropcluster {version} {name}'.format(params));
    },

    write: function (file, contents) {
      try {
        new Writer(file).write(contents);
      }
      catch (e) {
        console.log(e);
      }
    },

    /**
     * write contents to cluster config file
     */
    write_conf: function (cluster, file, contents) {
      ctl.write(cluster.config + '/' + file + '.conf');
    },

    /**
     * @static
     * synchronously invoke a shell command
     */
    _exec: function (cmd) {
      try {
        return execSync(cmd);
      }
      catch (e) {
        console.log('>> {message}'.format(e));
      }
    },

    /**
     * @static
     * @private
     */
    _parse: function (result, options) {
      options || (options = { });
      var matrix = _.compact(_.map((result || '').trim().split('\n'), function (row) {
          return row.trim() ? row.trim().split(/\s+/) : null;
        })),
        count = matrix.length - (options.shift || 0),
        header,
        map,
        parsed;

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
      parsed = _.map(matrix, function (row) {
        return _.object(header, _.map(row, _toNumber));
      });
      return parsed;
    }
  });

  /**
   * @static
   * @private
   */
  function _toNumber (str) {
    if (isNaN(parseFloat(str)) || !isFinite(str)) {
      return str;
    }
    var f = parseFloat(str), i = parseInt(str, 10);
    return (f !== i) ? f : i;
  }

})();
