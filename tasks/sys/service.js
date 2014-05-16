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
      if (fs.existsSync(path.resolve(options.sys.sbindir, 'main.js'))) {
        fs.unlinkSync(path.resolve(options.sys.sbindir, 'main.js'));
      }
      exec('sudo -Ei -u {xt.name} USER={xt.name} HOME={xt.userhome} pm2 ping');
    },

    /** @override */
    executeTask: function (options) {
      fs.symlinkSync(
        path.resolve(options.xt.usersrc, 'node-datasource/main.js'),
        path.resolve(options.sys.sbindir, 'main.js')
      );

      // create upstart service "xtuple"
      if (!fs.existsSync('/etc/init.d/xtuple')) {
        exec('update-rc.d -f xtuple remove');
        exec('cp {sys.pm2.initscript} /etc/init.d/xtuple'.format(options));
        exec('update-rc.d xtuple defaults');
      }

      // write pm2 config files
      fs.writeFileSync(options.sys.pm2.configfile, options.sys.pm2.template.format(options));
    },
    
    /** @override */
    afterTask: function (options) {
      var ping = exec('sudo -Ei USER={xt.name} HOME={xt.userhome} pm2 ping'),
        start = exec('sudo -Ei USER={xt.name} HOME={xt.userhome} -u {xt.name} pm2 start -u {xt.name} {sys.pm2.configfile}'
            .format(options));

      if (start.code !== 0) {
        throw new Error(JSON.stringify(start));
      }

      //exec('sudo -Ei USER={xt.name} HOME={xt.userhome} -u {xt.name} service xtuple {xt.version} {xt.name} restart'.format(options));
    },

    /** @override */
    uninstall: function (options) {
      exec('sudo -Ei USER={xt.name} HOME={xt.userhome} -u {xt.name} pm2 delete all'.format(options));
      exec('killall -u {xt.name}'.format(options));
    },

    /** @override */
    afterInstall: function (options) {
      exec('service nginx reload');
      console.log();
      var dump = exec('sudo -Ei USER={xt.name} HOME={xt.userhome} -u {xt.name} pm2 dump'.format(options)),
        statusTable = exec('sudo service xtuple {xt.version} {xt.name} status'.format(options)).stdout;

      // running the status command actually loads the processes from the
      // user-specific file into the root process file.
      console.log(statusTable);
    }
  });

})();
