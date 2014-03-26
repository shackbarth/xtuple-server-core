(function () {
  'use strict';

  /**
   * Generate pg_hba.conf
   * <https://tools.ietf.org/html/rfc1918#section-3>
   * <http://www.postgresql.org/docs/9.3/static/auth-pg-hba-conf.html>
   */
  var hba = exports;

  var archetype = require('../sys/archetype'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    exec = require('execSync').exec,
    format = require('string-format'),
    filename_template = 'pg_hba-{version}.conf.template',
    xtuple_hba_entries = [
      '# xTuple HBA Entries (auto-generated)',
      '# ===================================================',

      'local      all             all                                     trust',

      '# internal network (rfc1918)',
      'hostssl    all             all             10.0.0.0/8              md5',
      'hostssl    all             all             172.16.0.0/12           md5',
      'hostssl    all             all             192.168.0.0/16          md5',

      '# xtuple\'s network (for remote maintenance)',
      'hostssl    all             all             .xtuple.com             md5',
      'hostssl    all             all             184.179.17.0/24         md5',

      '# world',
      '#hostssl   all             all             0.0.0.0/0               md5'
    ];
  
  _.extend(hba, archetype, /** @exports hba */ {

    /** @override */
    prelude: function (options) {
      var version = options.pg.version,
        name = options.xt.name,
        path = path.resolve('/etc/postgresql/', version, name, 'pg_hba.conf');

      return _.all([
        fs.existsSync(path)
      ]);
    },

    /** @override */
    install: function (options) {
      var pg = options.pg,
        xt = options.xt,
        hba_src = fs.readFileSync(path.resolve(__dirname, filename_template.format(pg))),
        hba_target = path.resolve('/etc/postgresql/', pg.version, xt.name, 'pg_hba.conf'),
        hba_extant = fs.readFileSync(hba_target),
        hba_conf = hba_extant.split('\n').concat(xtuple_hba_entries).join('\n');

      fs.writeFileSync(hba_target, hba_conf);
  
      return {
        path: hba_target,
        string: hba_conf
      };
    },

    /** @override */
    coda: function (options) {
      exec('chown -R postgres:postgres /etc/postgresql');
    }
  });

})();
