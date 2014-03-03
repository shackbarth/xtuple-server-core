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

    run: function (options) {
      return pgctl.createcluster({
        name: options.name,
        version: options.version
      });
    }
  });
})();
