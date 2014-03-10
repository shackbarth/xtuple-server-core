(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    path = require('path'),
    exec = require('execSync').exec,
    fs = require('fs');

  var configure = exports;

  _.extend(configure, /** @exports configure */ {

    cups_conf_path: path.resolve('/etc/cups/cupsd.conf'),

    run: function (options) {
      var cups_conf = fs.readFileSync(configure.cups_conf_path),
        new_conf = cups_conf.replace(/^Browsing Off/g, 'Browsing On');

      // write backup
      fs.writeFileSync(path.resolve('/etc/cups/', 'cupsd.conf.bak'), cups_conf);

      // write new conf file
      fs.writeFileSync(path.resolve(configure.cups_conf_path), new_conf);

      // TODO autodetect with lpstat -v
      // TODO write selection to config.js

      exec('sudo service cups restart');
    }
  });

})();
