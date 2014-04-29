(function () {
  'use strict';

  /**
   * Compile config vars for postgres setup
   */
  var pgconfig = exports;

  var lib = require('../../lib'),
    tuner = require('./tuner'),
    pghba = require('./hba'),
    exec = require('execSync').exec,
    format = require('string-format'),
    defaults = require('./defaults'),
    _ = require('lodash');
  
  _.extend(pgconfig, lib.task, /** @exports pgconfig */ {

    options: {
      host: {
        optional: '[host]',
        description: 'Postgres server host address',
        value: 'localhost'
      },
      mode: {
        required: '[mode]',
        description: 'Installation mode (dedicated|cloud|testing). Dedicated implies one slot per machine.',
        value: 'testing'
      },
      version: {
        optional: '[version]',
        description: 'Version of postgres to install',
        value: '9.3'
      },
      slots: {
        optional: '[int]',
        description: 'Number of provisioned "slots" to consume [1]',
        value: 1
      }
    },

    /** @override */
    beforeTask: function (options) {
      exec('usermod -a -G ssl-cert postgres');
    },

    /**
     *  options {
     *    version: 9.1,
     *    name: 'kelhay',
     *    mode: 'production',
     *    slots: 1,
     *    ...
     *  }
     *  @override
     */
    doTask: function (options) {
      var mode = options.pg.mode,
        slot = defaults.slot;

      _.extend(
        options.pg.config,
        { mode: mode, slots: options.pg.slots || 1 },
        slot.base,
        slot[mode]
      );
    },

    /**
     * Find the existing cluster that corresponds to our options, if it exists,
     * and set options.pg.cluster
     */
    discoverCluster: function (options) {
      options.pg.cluster = _.findWhere(lib.pgCli.lsclusters(), {
        name: options.xt.name,
        version: options.pg.version
      });
    }
  });
})();
