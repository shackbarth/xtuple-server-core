(function () {
  'use strict';

  var tuner = require('./tuner'),
    pghba = require('./hba'),
    pgctl = require('./ctl'),
    format = require('string-format'),
    defaults = require('./defaults'),
    _ = require('underscore');

  if (defaults.env.platform !== 'linux') {
    throw 'Incompatible OS detected';
  }

  var pg = exports;
  
  _.extend(pg, /** @exports pg */ {

    options: {
      name: {
        required: true,
        description: 'Name of the installation'
      },
      version: {
        description: 'Version of postgres to install',
        value: defaults.slot.base.version,
      },
      slots: {
        description: 'Number of slots to consume',
        value: 1
      },
      mode: {
        description: 'Installation mode (production|staging|demo|development)',
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
    create: function (options) {
      if (!_.isString(options.name)) {
        throw 'setup requires a cluster name';
      }

      // set development mode if not specified
      var mode = options.mode || 'development',
        config = pg.configure(mode, options),
        cluster = pgctl.createcluster(config.version, config.name);

      return cluster;
      //tuner.write(cluster, config, defaults.env);
      //return pghba.write(cluster, config);
    },

    /**
     * derive additional info from the environment.
     */
    configure: function (mode, options) {
      var config = _.extend({ mode: mode }, defaults.base, defaults[mode], options),
        clusters = pgctl.lsclusters(),
        collection = _.compact(_.map(_.pluck(_.flatten(_.values(clusters)), 'config'), function (path) {
          var conf = path + '/postgresql.conf';
          try {
            return JSON.parse(pgctl._exec('head -1 ' + conf).slice(1));
          }
          catch (e) {
            console.log('>> %s is not readable by this tool', conf);
            console.log(e);
          }
        }));

      if (collection.length === 0) {
        return config;
      }

      //console.log(collection);
    }
  });
})();
