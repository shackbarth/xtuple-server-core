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
      exec('sudo HOME={xt.homedir} -u {xt.name} pm2 ping'.format(options));
    },

    /** @override */
    doTask: function (options) {
      // TODO replace this with xtuple-server <version> <name> <action>
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

      // XXX this is a workaround; something is creating files in these
      // directories as root
      exec('chown -R {xt.name} {sys.servicedir}'.format(options));
      exec('chmod -R 700 {sys.servicedir}'.format(options));
      exec('chown -R {xt.name}:xtuser {xt.logdir}'.format(options));
      exec('chmod -R 700 {xt.logdir}'.format(options));
      exec('chown -R {xt.name}:xtuser {xt.statedir}'.format(options));
      exec('chmod -R 700 {xt.statedir}'.format(options));
    },
    
    /** @override */
    afterTask: function (options) {
      exec('service nginx reload');
      service.launch(options);
      exec('sudo HOME={xt.homedir} -u {xt.name} service xtuple {xt.version} {xt.name} restart'.format(options));
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
    },

    /**
     * Launch a service.
     * @param config  resolved path to the pm2 json config file
     * @public
     */
    launch: function (options) {
      var ping = exec('sudo HOME={xt.homedir} pm2 ping'.format(options)),
        start = exec('sudo HOME={xt.homedir} pm2 start -u {xt.name} {sys.pm2.configfile}'
            .format(options));

      if (start.code !== 0) {
        throw new Error(JSON.stringify(start));
      }

      return start;
    }
  });

})();
