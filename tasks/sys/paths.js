(function () {
  'use strict';

  /**
   * Sets up system file and directory paths
   */
  var paths = exports;

  var task = require('../../lib/task'),
    fs = require('fs'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('underscore');

  _.extend(paths, task, /** @exports paths */ {

    /** @override */
    beforeInstall: function (options) {
      var version = options.xt.version,
        name = options.xt.name;

      options.xt.configfile = path.resolve(options.xt.configdir, 'config.js');
      options.xt.configdir = path.resolve('/etc/xtuple', version, name);
      options.xt.ssldir = path.resolve('/etc/xtuple', version, name, 'ssl');
      options.xt.logdir = path.resolve('/var/log/xtuple', version, name);
      options.xt.socketdir = path.resolve('/var/run/postgresql');
      options.xt.statedir = path.resolve('/var/lib/xtuple', version, name);
      options.xt.srcdir = path.resolve('/usr/local/xtuple/src/', options.xt.version);
      options.xt.coredir = path.resolve(options.xt.srcdir, 'xtuple');
      options.xt.extdir = path.resolve(options.xt.srcdir, 'xtuple-extensions');
      options.xt.privatedir = path.resolve(options.xt.srcdir, 'private-extensions');

      exec('mkdir -p ' + path.resolve(options.xt.configdir, 'test/lib'));


      exec('mkdir -p ' + options.xt.configdir);
      exec('mkdir -p ' + options.xt.ssldir);
      exec('mkdir -p ' + options.xt.logdir);
      exec('mkdir -p ' + options.xt.socketdir);
      exec('mkdir -p ' + options.xt.statedir);
      exec('mkdir -p ' + options.xt.srcdir);

      exec('chown xtadmin:xtuser '+ options.xt.srcdir);
      exec('chown -R xtadmin:xtuser '+ options.xt.coredir);
      exec('chown -R xtadmin:xtuser '+ options.xt.extdir);
      exec('chown -R xtadmin:xtadmin '+ options.xt.privatedir);
      
      exec('chmod u=rwx,g=rx '+ options.xt.coredir);
      exec('chmod u=rwx,g=rx '+ options.xt.extdir);
      exec('chmod u=rwx,g=rx,o-rwx '+ options.xt.privatedir);
    },

    doTask: function (options) {

    }

  });
})();
