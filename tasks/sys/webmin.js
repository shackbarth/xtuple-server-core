(function () {
  'use strict';

  /**
   * Install and configure webmin
   */
  var webmin = exports;

  var lib = require('../../lib'),
    format = require('string-format'),
    _ = require('lodash'),
    path = require('path'),
    exec = require('execSync').exec,
    fs = require('fs');

  _.extend(webmin, lib.task, /** @exports webmin */ {

    beforeInstall: function (options) {
      options.sys.webminConfigPath = path.resolve('/etc/webmin');
      options.sys.webminCustomPath = path.resolve(options.sys.webminConfigPath, 'custom');
    },

    doTask: function (options) {
      // TODO if debian
      exec('wget https://s3.amazonaws.com/com.xtuple.deploy-assets/webmin_1.680_all.deb');
      exec('dpkg --install webmin_1.680_all.deb');

      webmin.installCustomCommands(options);
      webmin.installNginxSite(options);
    },

    afterTask: function (options) {
      exec('service nginx reload');
    },

    installCustomCommands: function (options) {
      fs.writeFileSync(options.sys.webminCustomPath, fs.readFileSync('1399142566.cmd'));
      fs.writeFileSync(options.sys.webminCustomPath, fs.readFileSync('1399145736.cmd'));
    },

    installNginxSite: function (options) {
      options.nginx.outkey = path.resolve('/srv/ssl/xtremote.key');
      options.nginx.outcrt = path.resolve('/srv/ssl/xtremote.crt');

      if (!fs.existsSync(options.nginx.outcrt)) {
        require('../nginx/ssl').generate(options);
      }

      // write site file
    }
  });

})();

