(function () {
  'use strict';

  /**
   * Compile config vars for postgres setup
   */
  var pgconfig = exports;

  var task = require('../../lib/task'),
    tuner = require('./tuner'),
    pghba = require('./hba'),
    pgcli = require('../../lib/pg-cli'),
    exec = require('execSync').exec,
    format = require('string-format'),
    defaults = require('./defaults'),
    _ = require('underscore');
  
  _.extend(pgconfig, task, /** @exports pgconfig */ {

    options: {
      host: {
        required: '[host]',
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
     * derive additional info from the environment.
     */
    configure: function (mode, options) {
      var config = _.extend({ mode: mode }, defaults.base, defaults[mode], options),
        clusters = pgcli.lsclusters(),
        collection = _.compact(_.map(_.pluck(_.flatten(_.values(clusters)), 'config'),
            function (path) {
          var conf = path + '/postgresql.conf';
          try {
            return JSON.parse(exec('head -1 ' + conf).slice(1));
          }
          catch (e) {
            return('%s is not readable by this tool', conf);
          }
        }));

      // TODO check 'collection' against provisioning guidelines

      return config;
    }
  });
})();
