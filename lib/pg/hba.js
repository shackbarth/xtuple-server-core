(function () {
  'use strict';

  /**
   * Generate pg_hba.conf
   * <https://tools.ietf.org/html/rfc1918#section-3>
   * <http://www.postgresql.org/docs/9.3/static/auth-pg-hba-conf.html>
   */

  var format = require('string-format'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    m = require('mstring'),
    pgctl = require('./ctl'),

    /**
     * allow authentication via password to all private subnets
     * xtuple maintenance hatch; requires password
     *
     *  TYPE    DATABASE        USER            ADDRESS                 METHOD
     */
    hba_conf_template = m(function () {
      /***
      local   all             postgres                                peer
      local   all             all                                     trust

      host    all             all             127.0.0.1/32            trust
      host    all             all             ::1/128                 trust

      host    all             all             10/8                    md5
      host    all             all             172.16/12               md5
      host    all             all             192.168/16              md5

      host    all             all             .xtuple.com             md5
      ***/
    });
  
  var hba = exports;

  _.extend(hba, /** @exports hba */ {

    /**
     * generate and wite a secure pg_hba.conf file to disk.
     * @static
     */
    run: function (options) {
      var hba_conf = hba_conf_template
          .format(options)
          .trim(),
        pg = options.pg,
        hba_conf_path = path.resolve('/etc/postgresql/', '' + pg.version, pg.name, 'pg_hba.conf');

      if (options.dry !== true) {
        fs.writeFileSync(hba_conf_path, hba_conf);
      }
      return {
        string: hba_conf,
        json: options
      };
    }
  });

})();
