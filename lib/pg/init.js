(function () {
  'use strict';

  var pgctl = require('./ctl'),
    exec = require('exec-sync'),
    m = require('mstring'),
    _ = require('underscore'),
    format = require('string-format'),
    init_sql_template = m(function () {
      /***
        CREATE USER admin WITH PASSWORD '{adminpw}' CREATEDB CREATEUSER IN GROUP xtrole;
      ***/
    });

  var init = exports;

  _.extend(init, /** @exports init */ {

    options: {
      adminpw: {
        required: '<password>',
        description: 'Password for the database "admin" user'
      }
    },

    /** @static */
    run: function (options) {
      var pg = options.pg,
      init_sql = init_sql_template.format(options.pg)
        .replace(/^\s+/mg, '')
        .trim();

      pgctl.ctlcluster({
        version: pg.config.version,
        name: pg.cluster.name,
        action: 'start'
      });

      exec('sudo -u postgres psql -q -p {port} -c "CREATE GROUP xtrole"'
        .format(options.pg.cluster));

      exec('sudo -u postgres psql -q -p {port} -c "{sql}"'
        .format(_.extend({ sql: init_sql }, options.pg.cluster)));

      //exec('sudo -u postgres psql -q -c "CREATE EXTENSION plv8"');

      return options;
    }
  });
})();
