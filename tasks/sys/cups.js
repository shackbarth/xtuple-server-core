(function () {
  'use strict';

  /**
   * Configure the cups server needed for automated printing
   */
  var cups = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    _ = require('lodash'),
    path = require('path'),
    exec = require('execSync').exec,
    fs = require('fs');

  _.extend(cups, task, /** @exports cups */ {

    conf_path: path.resolve('/etc/cups/cupsd.conf'),

    /** @override */
    executeTask: function (options) {
      var cups_conf = fs.readFileSync(cups.conf_path, 'ascii'),
        new_conf = cups_conf.replace(/^Browsing Off/g, 'Browsing On');

      // write backup
      fs.writeFileSync(path.resolve('/etc/cups/', 'cupsd.conf.bak'), cups_conf);

      // write new conf file
      fs.writeFileSync(path.resolve(cups.conf_path), new_conf);

      // TODO autodetect with lpstat -v
      // TODO write selection to config.js

      exec('service cups restart');
    }
  });
})();
