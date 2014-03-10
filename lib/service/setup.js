(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    pgctl = require('../pg/ctl'),
    exec = require('execSync').exec,
    m = require('mstring'),
    fs = require('fs'),
    path = require('path');

  var configure = exports;

  _.extend(configure, /** @exports config */ {

    /** @static */
    run: function (options) {
      var install_format = {
          service_src: path.resolve(__dirname, 'xtuple.sh'),
          service_target: path.resolve('/etc/init.d/xtuple')
        },
        app_id = {
          name: options.pg.name,
          version: options.xt.version
        },
        main_symlink = {
          link_name: '/usr/sbin/xtuple/{version}/{name}/main.js'.format(app_id),
          target: path.resolve(options.xt.appdir, 'node-datasource/main.js')
        };

      exec('sudo npm install -g forever');

      // write /usr/sbin symlink for node-datasource main. this is so that the
      // forever service can see a unique 'SCRIPT' value for each running
      // instance, though they may point to the same main.js file
      exec('sudo -u xtuple mkdir -p /usr/sbin/xtuple/{version}/{name}'.format(app_id));
      exec('sudo -u xtuple ln -s {target} {link_name}'.format(main_symlink));

      // remove service if exists, then create
      exec('sudo update-rc.d -f xtuple remove');

      // install service script (XXX debian-specific)
      exec('sudo cp {service_src} {service_target}'.format(install_format));
      exec('sudo chmod +x {service_target}'.format(install_format));
      exec('sudo update-rc.d xtuple defaults');

      // restart to effect any changes that may have been made
      pgctl.ctlcluster(_.extend({ action: 'restart' }, app_id));
      exec('sudo service nginx reload');

      exec('sudo service xtuple {version} {name} start'.format(app_id));

      return {
        state: 'running'
      };
    }
  });
})();
