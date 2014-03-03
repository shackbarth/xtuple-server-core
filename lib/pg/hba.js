(function () {
  'use strict';

  /**
   * Generate pg_hba.conf
   * <https://tools.ietf.org/html/rfc1918#section-3>
   * <http://www.postgresql.org/docs/9.3/static/auth-pg-hba-conf.html>
   */

  var format = require('string-format'),
    _ = require('underscore'),
    m = require('mstring'),
    pgctl = require('./ctl'),
    Writer = require('simple-file-writer'),

    /**
     * TYPE  DATABASE        USER            ADDRESS                 METHOD
     * allow authentication via password to all private subnets
     * xtuple maintenance hatch; requires password
     */
    hba_conf_template = m(function () {
      /***
        local   all             postgres                                peer
        local   all             all                                     peer
        host    all             all             127.0.0.1/32            trust

        host    all             all             10/8                    md5
        host    all             all             172.16/12               md5
        host    all             all             192.168/16              md5

        host    all             all             .xtuple.com             md5
        host    all             all             ::1/128                 md5
      ***/
    });
  
  var hba = exports;

  _.extend(hba, /** @exports hba */ {

    /**
     * generate and wite a secure pg_hba.conf file to disk.
     * @static
     */
    write: function (cluster, config) {
      var hba_conf = hba_conf_template
        .format(config)
        .replace(/^\s+/mg, '')
        .trim();

      if (config.dry !== true) {
        pgctl.write_conf(cluster, 'pg_hba.conf', hba_conf);
      }
      return hba_conf;
    }
  });

})();
