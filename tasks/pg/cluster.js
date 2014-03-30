(function () {
  'use strict';

  /**
   * Create a new postgres cluster.
   */
  var cluster = exports;

  var task = require('../sys/task'),
    pgcli = require('../../lib/pg-cli'),
    _ = require('underscore');

  _.extend(cluster, task, /** @exports cluster */ {

    options: {
      slots: {
        optional: '[slots]',
        description: 'Number of slots to consume',
        value: 1
      }
    },

    /** @override */
    validate: function (options) {
      return _.all([
        _.isString(options.xt.name),
        _.isNumber(options.pg.version) || _.isString(options.pg.version)
      ]);
    },

    /** @override */
    install: function (options) {
      var cluster = {
          name: options.xt.name,
          version: options.pg.version
        },
        result = pgcli.createcluster(cluster);

      return result;
    }
  });
})();
