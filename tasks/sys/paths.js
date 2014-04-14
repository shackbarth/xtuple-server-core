(function () {
  'use strict';

  /**
   * Sets up system file and directory paths
   */
  var paths = exports;

  var lib = require('../../lib'),
    fs = require('fs'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('underscore');

  _.extend(paths, lib.task, /** @exports paths */ {

    /** @override */
    doTask: function (options) {
      var version = options.xt.version,
        name = options.xt.name;

      // node server/config stuff
      options.xt.configdir = path.resolve('/etc/xtuple', version, name);
      options.xt.configfile = path.resolve(options.xt.configdir, 'config.js');
      options.xt.buildconfigfile = path.resolve(options.xt.configdir, 'build/config.js');
      options.xt.ssldir = path.resolve('/etc/xtuple', version, name, 'ssl');
      options.xt.rand64file = path.resolve('/etc/xtuple', version, name, 'rand64.txt');
      options.xt.key256file = path.resolve('/etc/xtuple', version, name, 'key256.txt');
      options.xt.userhome = path.resolve('/usr/local/', options.xt.name);
      options.xt.usersrc = path.resolve(options.xt.userhome, options.xt.version, 'xtuple');
      options.xt.testloginfile = path.resolve(options.xt.usersrc, 'test/lib/login_data.js');
      options.xt.testconfigfile = path.resolve(options.xt.usersrc, 'node-datasource/config.js');

      // other system paths
      options.xt.logdir = path.resolve('/var/log/xtuple', version, name);
      options.xt.socketdir = path.resolve('/var/run/postgresql');
      options.xt.statedir = path.resolve('/var/lib/xtuple', version, name);
      options.sys.sbindir = path.resolve('/usr/sbin/xtuple/{xt.version}/{xt.name}'.format(options));
      options.sys.servicedir = path.resolve(options.xt.configdir, 'services');

      // repositories
      options.xt.srcdir = path.resolve('/usr/local/xtuple/src/', options.xt.version);
      options.xt.coredir = path.resolve(options.xt.srcdir, 'xtuple');
      options.xt.extdir = path.resolve(options.xt.srcdir, 'xtuple-extensions');
      options.xt.privatedir = path.resolve(options.xt.srcdir, 'private-extensions');

      //exec('mkdir -p ' + path.resolve(options.xt.configdir, 'test'));
      exec('mkdir -p ' + options.xt.userhome);
      exec('mkdir -p ' + options.xt.usersrc);

      exec('mkdir -p ' + options.xt.configdir);
      exec('mkdir -p ' + path.resolve(options.xt.configdir, 'build'));
      exec('mkdir -p ' + options.xt.ssldir);
      exec('mkdir -p ' + options.xt.logdir);
      exec('mkdir -p ' + options.xt.socketdir);
      exec('mkdir -p ' + options.xt.statedir);
      exec('mkdir -p ' + options.xt.srcdir);
      exec('mkdir -p ' + options.sys.servicedir);
      exec('mkdir -p ' + options.sys.sbindir);

      exec('chown -R xtadmin:xtuser '+ options.xt.srcdir);
      exec('chown -R xtadmin:xtuser '+ options.xt.coredir);
      exec('chown -R xtadmin:xtuser '+ options.xt.extdir);
      exec('chown -R xtadmin:xtadmin '+ options.xt.privatedir);
      
      exec('chmod u=rwx,g=rx '+ options.xt.coredir);
      exec('chmod u=rwx,g=rx '+ options.xt.extdir);
      exec('chmod u=rwx,g=rx,o-rwx '+ options.xt.privatedir);
    },

    uninstall: function (options) {

    }

  });
})();
