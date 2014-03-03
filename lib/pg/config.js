(function () {
  'use strict';

  var tuner = require('./tuner'),
    pghba = require('./hba'),
    pgctl = require('./ctl'),
    format = require('string-format'),
    defaults = require('./defaults'),
    _ = require('underscore');

  var pg = exports;
  
  _.extend(pg, /** @exports pg */ {

    options: {
      version: {
        optional: '[version]',
        description: 'Version of postgres to install',
        value: defaults.slot.base.version
      },
      mode: {
        optional: '[mode]',
        description: 'Installation mode (production|staging|demo|development) [development]',
        value: 'development'
      }
    },

    /**
     *  options {
     *    version: 9.1,
     *    name: 'kelhay',
     *    mode: 'production',
     *    slots: 1,
     *    ...
     *  }
     */
    run: function (options) {
      // set development mode if not specified
      var mode = options.mode || 'development',
        slot = defaults.slot;
        //config = pg.configure(mode, options);

      return _.extend({ mode: mode }, slot.base, slot[mode]);
    },

    /**
     * derive additional info from the environment.
     */
    configure: function (mode, options) {
      var config = _.extend({ mode: mode }, defaults.base, defaults[mode], options),
        clusters = pgctl.lsclusters(),
        collection = _.compact(_.map(_.pluck(_.flatten(_.values(clusters)), 'config'),
            function (path) {
          var conf = path + '/postgresql.conf';
          try {
            return JSON.parse(pgctl._exec('head -1 ' + conf).slice(1));
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
