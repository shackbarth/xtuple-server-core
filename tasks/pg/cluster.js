(function () {
  'use strict';

  /**
   * Create a new postgres cluster and prime it to the point of being able
   * to receive import of xtuple databases.
   */
  var cluster = exports;

  var task = require('../sys/task'),
    pgcli = require('../../lib/pg-cli'),
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
    install: function (options) {
      var cluster = {
          name: options.xt.name,
          version: options.pg.version
        },
        result = pgcli.createcluster(cluster),
        started = pgcli.pgctlcluster(_.extend({ action: 'start' }, cluster));

      // Docs: <http://www.postgresql.org/docs/9.3/static/sql-createrole.html>
      // create xtrole
      (function () {
        return knex.raw('CREATE ROLE xtrole');
      })()
      // create 'admin' user (default xtuple client superuser)
      .then(function (memo) {
        return knex.raw([

          'CREATE USER admin WITH',
          'NOSUPERUSER NOREPLICATION ',
          'PASSWORD \'{adminpw}\' CREATEUSER CREATEDB',
          'IN ROLE xtrole'

        ].join(' ').format(options.pg));
      })
      // create xtdaemon user (used by node server); xtdaemon user must 
      // authenticate via SSL. 
      .then(function (memo) {
        return knex.raw([

          'CREATE USER xtweb WITH',
          'CREATEUSER CREATEDB',
          'PASSWORD NULL',
          'IN ROLE xtrole'
          
        ].join(' '));
      });

      return result;
    }
  });

  /** @listens knex */
  process.on('knex', function (_knex) { knex = _knex; });

})();
