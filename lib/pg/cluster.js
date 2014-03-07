(function () {
  'use strict';

  var tuner = require('./tuner'),
    pgctl = require('./ctl'),
    _ = require('underscore');

  var cluster = exports;

  _.extend(cluster, /** @exports cluster */ {

    options: {
      name: {
        required: '<name>',
        description: 'Name of the installation'
      },
      slots: {
        optional: '[slots]',
        description: 'Number of slots to consume',
        value: 1
      }
    },

    /** @static */
    run: function (options) {
      var cluster = pgctl.createcluster({
          name: options.pg.name,
          version: options.pg.version
        }),
        start = pgctl.ctlcluster(_.extend({ action: 'start' }, options.pg));

      return cluster;
    }
  });
})();
