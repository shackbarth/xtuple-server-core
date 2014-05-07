(function () {
  'use strict';

  /**
   * Append entries to the system hosts file if necessary.
   */
  var etchosts = exports;

  var lib = require('../../lib'),
    nginx = require('../nginx'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    _ = require('lodash'),

    hosts_template_path = path.resolve(__dirname, 'etc-hosts.template');

  _.extend(etchosts, lib.task, /** @exports etchosts */ {

    /** @override */
    executeTask: function (options) {
      var etc_hosts_template = fs.readFileSync(hosts_template_path).toString(),
        etc_hosts_current = fs.readFileSync(path.resolve('/etc/hosts'));

      if (new RegExp('customer=' + options.xt.name + ',').test(etc_hosts_current)) {
        // TODO log this event
      }
      else {
        fs.appendFileSync(path.resolve('/etc/hosts'), etc_hosts_template.format(options));
      }
    }
  });
})();
