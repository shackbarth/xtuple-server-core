(function () {
  'use strict';

  var pgctl = require('./ctl'),
    m = require('mstring'),
    _ = require('underscore'),
    format = require('string-format'),
    init_sql_template = m(function () {
      /***
        CREATE USER admin WITH PASSWORD '{dbadminpw}' CREATEDB CREATEUSER IN GROUP xtrole;
      ***/
    });

  var init = exports;

  _.extend(init, /** @exports init */ {

    options: {
      dbadminpw: {
        required: '<password>',
        description: 'Password for the database "admin" user'
      }
    },

    run: function (options) {
      var init_sql = init_sql_template.format(options)
        .replace(/^\s+/mg, '')
        .trim();
      pgctl._exec('sudo -u postgres psql -q -c CREATE GROUP xtrole >/dev/null');
      pgctl._exec('sudo -u postgres psql -q -c {sql} >/dev/null'.format({ sql: init_sql }));
      //exec('sudo -u postgres psql -q -c "CREATE EXTENSION plv8"');

      return options;
    }
  });
})();

