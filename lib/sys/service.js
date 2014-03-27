(function () {
  'use strict';

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
        pm2_template = fs.readFileSync(path.resolve(__dirname, 'pm2-xtuple-fork.json')),
        pm2_web_conf = fs.readFileSync(path.resolve(__dirname,' pm2-web.json')),
        pm2_conf = pm2_template.format(_.extend({ port: options.xt.serverconfig.port }, options.xt)),
        sbin_js = path.resolve('/usr/sbin/xtuple', options.xt.version, options.xt.name),
        etc_xtuple = path.resolve('/etc/xtuple', options.xt.version, options.xt.name),
        xt_conf_target = path.resolve(etc_xtuple, 'config.js'),
        pm2_conf_target = path.resolve(etc_xtuple, 'pm2-process.json'),
        pm2_web_conf_target = path.resolve(__dirname, 'pm2-web.json');

      // symlink main.js to sbin
      fs.symlinkSync(path.resolve(options.xt.appdir, 'node-datasource/main.js'), sbin_js);

      // write pm2 config files
      fs.writeFileSync(etc_xtuple, pm2_conf_target);
      fs.writeFileSync(pm2_web_conf_target, pm2_web_conf);

      // download/install pm2 service
      exec('npm install -g pm2');
      exec('npm install -g https://github.com/xtuple/pm2-web/tarball/master');
      exec('pm2 startup ubuntu -u xtnode');
      exec(['pm2 start', pm2_web_conf, '-x -u xtnode'].join(' '));
      exec(['pm2 start', pm2_conf_target, '-x -u xtnode -- -c', xt_conf_target].join(' '));
    }

  });
})();
