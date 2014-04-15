(function () {
  'use strict';

  /**
   * Create a process manager service
   */
  var service = exports;

  var lib = require('../../lib'),
    format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    fs = require('fs'),
    path = require('path');

  _.extend(service, lib.task, /** @exports service */ {

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
    },

    /** @override */
    doTask: function (options) {
      options.sys.pm2 = {
        template: fs.readFileSync(path.resolve(__dirname, 'pm2-core-services.json')).toString(),
        configfile: path.resolve(options.sys.servicedir, 'pm2-core-services.json'),
        initscript: path.resolve(__dirname, 'pm2-init.sh')
      };

      // symlink main.js to sbin
      fs.symlinkSync(
        path.resolve(options.xt.usersrc, 'node-datasource/main.js'),
        path.resolve(options.sys.sbindir, 'main.js')
      );

      // download/install pm2 service
      exec('npm install -g https://github.com/xtuple/pm2/tarball/master');
      exec('npm install -g https://github.com/xtuple/pm2-web/tarball/master');

      exec('rm -rf {xt.logdir}/*'.format(options));

      exec('chown -R {xt.name}:xtuser {xt.logdir}'.format(options));
      exec('chmod -R 777 {xt.logdir}'.format(options));
      exec('chown -R {xt.name}:xtuser {sys.servicedir}'.format(options));
      exec('chmod -R 777 {sys.servicedir}'.format(options));

      // create upstart service, and rename it "xtuple"
      exec('sudo -u {xt.name} pm2 ping'.format(options));
      exec('pm2 startup ubuntu');
      exec('cp {sys.pm2.initscript} /etc/init.d/xtuple'.format(options));

      // write pm2 config files
      fs.writeFileSync(options.sys.pm2.configfile, options.sys.pm2.template.format(options));
      exec('chown -R {xt.name} {sys.servicedir}'.format(options));
      exec('chmod -R 700 {sys.servicedir}'.format(options));
    },
    
    /** @override */
    afterTask: function (options) {
      exec('service nginx reload');
    },

    /** @override */
    uninstall: function (options) {
      exec('npm uninstall pm2 -g');
      exec('npm uninstall pm2-web -g');
    },

    /** @override */
    afterInstall: function (options) {
      // start process manager and web service
      var start = service.launch(options.sys.pm2.configfile, options);

      if (start.code !== 0) {
        throw new Error(start.stdout);
      }

      console.log();
      exec('service xtuple {xt.version} {xt.name} stop'.format(options));
      exec('service xtuple {xt.version} {xt.name} restart'.format(options));
      lib.pgCli.ctlcluster({ name: options.xt.name, version: options.pg.version, action: 'stop' });
      var pm2status = exec('service xtuple {xt.version} {xt.name} status'.format(options));

      if (pm2status.code !== 0) {
        throw new Error(pm2status.stdout);
      }
      console.log(pm2status.stdout);
    },

    /**
     * Launch a service.
     * @param config  resolved path to the pm2 json config file
     * @public
     */
    launch: function (config, options) {
      var ping = exec('sudo -u {xt.name} pm2 ping'.format(options));
      if (ping.code !== 0) {
        throw new Error(ping.stdout);
      }
      return exec('sudo -u {xt.name} pm2 start {config} -u {xt.name}'
        .format(_.extend({ config: config }, options)));
    }
  });

})();
