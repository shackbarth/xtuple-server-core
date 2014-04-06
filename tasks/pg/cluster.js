(function () {
  'use strict';

  /**
   * Create a new postgres cluster and prime it to the point of being able
   * to receive import of xtuple databases.
   */
  var cluster = exports;

  var task = require('../../lib/task'),
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
    beforeInstall: function (options) {
      var exists = _.findWhere(pgcli.lsclusters(), {
        name: options.xt.name,
        version: parseFloat(options.pg.version)
      });

      if (exists) {
        throw new Error('cluster configuration already exists');
      }
    },

    /** @override */
    doTask: function (options) {
      var newCluster = {
        name: options.xt.name,
        version: options.pg.version
      };
      _.extend(options.pg.cluster, pgcli.createcluster(newCluster), newCluster);
      options.pg.cluster.start = pgcli.ctlcluster(_.extend({ action: 'start' }, newCluster));
      console.log(newCluster);
      console.log(options.pg.cluster);

      cluster.initCluster(options);
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

      _.each(queries, _.partial(pgcli.psql, options));
    }
  });

  /** @listens knex */
  process.on('knex', function (_knex) { knex = _knex; });

})();
