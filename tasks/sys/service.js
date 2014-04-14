(function () {
  'use strict';

  /**
   * Create a process manager service
   */
  var service = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    fs = require('fs'),
    path = require('path');

  _.extend(service, task, /** @exports service */ {

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
      var pm2 = {
          template: fs.readFileSync(path.resolve(__dirname, 'pm2-core-services.json')).toString(),
          services_conf_target: path.resolve(options.sys.servicedir, 'pm2-core-services.json'),
          init_sh_path: path.resolve(__dirname, 'pm2-init.sh')
        };

      pm2.init_sh = fs.readFileSync(pm2.init_sh_path).toString(),
      pm2.conf = pm2.template.format(options);
          
      // symlink main.js to sbin
      fs.symlinkSync(
        path.resolve(options.xt.usersrc, 'node-datasource/main.js'),
        path.resolve(options.sys.sbindir, 'main.js')
      );

      // download/install pm2 service
      exec('npm install -g https://github.com/xtuple/pm2/tarball/master');
      exec('npm install -g https://github.com/xtuple/pm2-web/tarball/master');

      // create upstart service, and rename it "xtuple"
      exec('pm2 startup ubuntu');
      fs.writeFileSync(pm2.init_sh_path, pm2.init_sh);
      fs.symlinkSync(pm2.init_sh_path, '/etc/init.d/xtuple');

      // write pm2 config files
      fs.writeFileSync(pm2.services_conf_target, pm2.conf);

      // start process manager and web service
      exec(['pm2 start', pm2.services_conf_target, '-x -u xtweb -- -c', options.xt.configfile].join(' '));
      service.launch(pm2.services_conf_target);
    },

    /**
     * Launch a service.
     * @param config  resolved path to the pm2 json config file
     * @public
     */
    launch: function (config) {
      return exec('pm2 start {config} -x -u xtweb'.format({ config: config }));
    }
  });

})();
