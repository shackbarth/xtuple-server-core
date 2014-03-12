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
        pg_id = {
          name: options.pg.name,
          version: options.pg.version
        },
        main_symlink = {
          link_name: '/usr/sbin/xtuple/{version}/{name}/main.js'.format(app_id),
          target: path.resolve(options.xt.appdir, 'node-datasource/main.js')
        };

      exec('npm install -g forever@0.10.11');

      // create state directory used by forever
      exec('mkdir -p /var/lib/xtuple/{version}/{name}'.format(app_id));
      exec('chown -R xtuple /var/lib/xtuple');

      // write /usr/sbin symlink for node-datasource main. this is so that the
      // forever service can see a unique 'SCRIPT' value for each running
      // instance, though they may point to the same main.js file
      exec('mkdir -p /usr/sbin/xtuple/{version}/{name}'.format(app_id));
      exec('chown -R xtuple /usr/sbin/xtuple');
      exec('rm -f {link_name}'.format(main_symlink));
      exec('ln -s {target} {link_name}'.format(main_symlink));

      // remove service if exists, then create
      exec('update-rc.d -f xtuple remove');

      // install service script (XXX debian-specific)
      exec('rm -f {service_target}'.format(install_format));
      exec('cp {service_src} {service_target}'.format(install_format));
      exec('chmod +x {service_target}'.format(install_format));
      exec('update-rc.d xtuple defaults');

      // restart to effect any changes that may have been made
      pgctl.ctlcluster(_.extend({ action: 'reload' }, pg_id));
      exec('service nginx reload');
      exec('service xtuple {version} {name} start'.format(app_id));

      return {
        state: 'running'
      };
    }
  });
})();
