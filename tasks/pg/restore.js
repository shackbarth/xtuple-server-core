(function () {
  'use strict';

  /**
   * Restore a database from a single file
   */
  var restore = exports;

  var lib = require('../../lib'),
    pgconfig = require('./config'),
    fs = require('fs'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('lodash');

  _.extend(restore, lib.task, /** @exports restore */ {

    options: _.extend({
      backupfile: {
        required: '<backupfile>',
        description: 'Path to the postgres backup'
      },
      targetdb: {
        required: '<targetdb>',
        description: 'Name of target database to create'
      }

    }, pgconfig.options),

    /** @override */
    beforeTask: function (options) {
      pgconfig.discoverCluster(options);
    },

    /** @override */
    executeTask: function (options) {
      // restore database
      lib.pgCli.restore(_.extend({
        filename: path.resolve(options.pg.backupfile),
        dbname: options.pg.targetdb
      }, options));

      // update config.js
      var configObject = require(options.xt.configfile);
      configObject.datasource.databases.push(options.pg.targetdb);
      fs.writeFileSync(options.xt.configfile, lib.xt.build.wrapModule(configObject));
    },

    /** @override */
    afterTask: function (options) {
      exec('HOME=~{xt.name} sudo -u {xt.name} service xtuple {xt.version} {xt.name} restart'.format(options));
    }
  });

})();
