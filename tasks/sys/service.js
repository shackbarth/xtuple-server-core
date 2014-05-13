(function () {
  'use strict';

  /**
   * Create a process manager service
   */
  var service = exports;

  var lib = require('../../lib'),
    format = require('string-format'),
    _ = require('lodash'),
    exec = require('execSync').exec,
    fs = require('fs'),
    path = require('path');

  _.extend(service, lib.task, /** @exports service */ {

    /** @override */
    beforeInstall: function (options) {
      options.sys.pm2 = {
        template: fs.readFileSync(path.resolve(__dirname, 'pm2-core-services.json')).toString(),
        configfile: path.resolve(options.sys.servicedir, 'pm2-core-services.json'),
        initscript: path.resolve(__dirname, 'pm2-init.sh')
      };
    },

    /** @override */
    beforeTask: function (options) {
      try {
        fs.unlinkSync(path.resolve(options.sys.sbindir, 'main.js'));
      }
      catch (e) { }
      try {
        fs.unlinkSync('/etc/init.d/xtuple');
      }
      catch (e) { }
      exec('sudo pm2 ping');
    },

    /** @override */
    executeTask: function (options) {
      fs.symlinkSync(
        path.resolve(options.xt.usersrc, 'node-datasource/main.js'),
        path.resolve(options.sys.sbindir, 'main.js')
      );

      // create upstart service "xtuple"
      exec('update-rc.d -f pm2-init.sh remove');
      exec('update-rc.d -f xtuple remove');
      exec('cp {sys.pm2.initscript} /etc/init.d/xtuple'.format(options));
      exec('update-rc.d xtuple defaults');

      // write pm2 config files
      fs.writeFileSync(options.sys.pm2.configfile, options.sys.pm2.template.format(options));
    },
    
    /** @override */
    afterTask: function (options) {
      var ping = exec('pm2 ping'),
        start = exec('sudo HOME={xt.homedir} pm2 start -u {xt.name} {sys.pm2.configfile}'
            .format(options));

      if (start.code !== 0) {
        throw new Error(JSON.stringify(start));
      }

      exec('sudo HOME={xt.homedir} -u {xt.name} service xtuple {xt.version} {xt.name} restart'.format(options));
      exec('service nginx reload');
    },

    /** @override */
    uninstall: function (options) {
      exec('killall -u {xt.name}'.format(options));
      exec('sudo HOME={xt.homedir} pm2 delete xtuple-server-{xt.version}-{xt.name}'.format(options));
      exec('sudo HOME={xt.homedir} pm2 delete xtuple-healthfeed-{xt.version}-{xt.name}'.format(options));
      exec('sudo HOME={xt.homedir} pm2 delete xtuple-snapshotmgr-{xt.version}-{xt.name}'.format(options));
    },

    /** @override */
    afterInstall: function (options) {
      console.log();
      var dump = exec('sudo HOME={xt.homedir} pm2 dump all'.format(options)),
        statusTable = exec('sudo -u {xt.name} service xtuple {xt.version} {xt.name} status'
          .format(options)).stdout;

      console.log(statusTable);
    }
  });

})();
