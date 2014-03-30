(function () {
  'use strict';

  /**
   * Configure and manage postgres.
   * XXX crap, I accidentally named this module 'pg'. Why is that a problem?
   * Because there is already a pg module. So if you accidentally require('pg')
   * instead of require('../pg') then your life will become very confusing and
   * sad.
   * TODO change name
   */
  var pg = exports;

  var exec = require('execSync').exec,
    Knex = require('knex'),
    _ = require('underscore');

  _.extend(pg, /** @exports pg */ {
    
    /**
     * Initialize a connection to the dataase using the same options map that
     * the modules are going to be handling as part of their normal business.
     * options is converted to:
     *  <https://github.com/brianc/node-postgres/wiki/Client#parameters>
     *
     * @public
     * @param options.xt.name
     * @param options.pg.version
     * @param options.pg.host
     * @param options.pg.port
     * @param options.database
     */
    init: function (options) {
      process.emit('knex', Knex.initialize({
        client: 'pg',
        debug: true,
        connection: {
          host: options.pg.host || '127.0.0.1',
          port: options.pg.port,
          user: options.xt.name,
          ssl: true,
          database: options.database,
          charset: 'utf8'
        }
      }));
    },

    cluster: require('./cluster'),
    defaults: require('./defaults'),
    hba: require('./hba'),
    snapshotmgr: require('./snapshotmgr'),
    tuner: require('./tuner')
  });

  // setup database connection
  process.on('init', function (options) {
    pg.init(options);
  });

})();
