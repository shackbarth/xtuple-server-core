(function () {
  'use strict';

  /**
   * Create a process manager service
   */
  var service = exports;

  var format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    fs = require('fs'),
    path = require('path');

  _.extend(service, /** @exports service */ {

    /**
     * Inject custom location into nginx config
     * @override
     */
    /*
    prelude: function (options) {
      options.nginx.locations['xpanel'] = {
        upstream: {
          server: local
        }
      };
    },
    */

    /** @static */
    run: function (options) {
      var install_format = {
          service_src: path.resolve(__dirname, 'xtuple.sh'),
          service_target: path.resolve('/etc/init.d/xtuple')
        },
        sbin_js = path.resolve('/usr/sbin/xtuple', options.xt.version, options.xt.name),
        services_conf_path = path.resolve(
          '/etc/xtuple', options.xt.version, options.xt.name, 'services'
        ),
        xt_conf_target = path.resolve(services_conf_path, '..', 'config.js'),
        pm2 = {
          template: fs.readFileSync(path.resolve(__dirname, 'pm2-core-services.json')),
          services_conf_target: path.resolve(services_conf_path, 'pm2-core-services.json'),
          init_sh_path: path.resolve(__dirname, 'pm2-init.sh'),
          name: 'xt-{name}-{version}'.format(options.xt)
        };

      pm2.init_sh = fs.readFileSync(pm2.init_sh_path),
      pm2.conf = pm2.template.format(_.extend({ port: options.xt.serverconfig.port }, options.xt)),
          
      // symlink main.js to sbin
      fs.symlinkSync(path.resolve(options.xt.appdir, 'node-datasource/main.js'), sbin_js);

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
      exec(['pm2 start', pm2.conf_target, '-x -u xtweb -- -c', xt_conf_target].join(' '));
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
