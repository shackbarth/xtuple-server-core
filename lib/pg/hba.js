(function () {
  'use strict';

  /**
   * Generate pg_hba.conf
   * <https://tools.ietf.org/html/rfc1918#section-3>
   * <http://www.postgresql.org/docs/9.3/static/auth-pg-hba-conf.html>
   */
  var hba = exports;

  var format = require('string-format'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    exec = require('execSync').exec,
    pgctl = require('./ctl'),
    hba_conf_template = fs.readFileSync(path.resolve(__dirname, 'pg_hba.conf'));
  
  _.extend(hba, /** @exports hba */ {

    /**
     * generate and wite a secure pg_hba.conf file to disk.
     * @static
     */
    run: function (options) {
      var hba_conf = hba_conf_template.format(options),
        pg = options.pg,
        hba_conf_path = path.resolve('/etc/postgresql/', '' + pg.version, pg.name, 'pg_hba.conf');

      fs.writeFileSync(hba_conf_path, hba_conf);
      exec('chown -R postgres '+ path.dirname(hba_conf_path));
      pgctl.ctlcluster({ action: 'restart', version: pg.version, name: pg.name });
  
      return {
        string: hba_conf,
        json: options
      };
    }
  });

})();
