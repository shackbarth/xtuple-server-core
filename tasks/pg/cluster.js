(function () {
  'use strict';

  /**
   * Create a new postgres cluster and prime it to the point of being able
   * to receive import of xtuple databases.
   */
  var cluster = exports;

  var task = require('../sys/task'),
    pgcli = require('../../lib/pg-cli'),
    exec = require('execSync').exec,
    _ = require('underscore'),
    knex;

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
    run: function (options) {
      var cluster = {
          name: options.xt.name,
          version: options.pg.version
        },
        result = pgcli.createcluster(cluster),
        started = pgcli.pgctlcluster(_.extend({ action: 'start' }, cluster));

      cluster.initCluster(options);
      return result;
    },

    /**
     * Setup an existing, empty-ish cluster to receive xtuple.
     */
    initCluster: function (options) {
      // Docs: <http://www.postgresql.org/docs/9.3/static/sql-createrole.html>
      var queries = [
          // create xtrole
          'CREATE ROLE xtrole',

          // create 'admin' user (default xtuple client superuser)
          [ 'CREATE USER admin WITH',
            'PASSWORD \'{adminpw}\' CREATEUSER CREATEDB',
            'IN ROLE xtrole'
          ].join(' ').format(options.xt),

          // create xtdaemon user (used by node server)
          [ 'CREATE USER xtdaemon WITH',
            'CREATEUSER CREATEDB',
            'PASSWORD NULL',
            'IN ROLE xtrole'
          ].join(' ')
        ];

      return _.map(queries, _.partial(pgcli.psql, options));
    }
  });

  /** @listens knex */
  process.on('knex', function (_knex) { knex = _knex; });

})();
