(function () {
  'use strict';

  /**
   * Append entries to the system hosts file if necessary.
   */
  var etchosts = exports;

  var task = require('../../lib/task'),
    nginx = require('../nginx'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),

    hosts_template_path = path.resolve(__dirname, 'etc-hosts.template');

  _.extend(etchosts, task, /** @exports etchosts */ {

    /** @override */
    beforeTask: function (options) {
      return nginx.site.prelude(options);
    },

    /** @override */
    doTask: function (options) {
      var etc_hosts_template = fs.readFileSync(hosts_template_path),
        etc_hosts_current = fs.readFileSync(path.resolve('/etc/hosts')),
        formatter = _.extend({ }, options.xt, options.nginx);

      if (new RegExp('domain=' + options.xt.name).test(etc_hosts_current)) {
        // TODO log this event
      }
      else {
        fs.appendFileSync(
          path.resolve('/etc/hosts'),
          etc_hosts_template.format(formatter)
        );
      }
    }
  });

})();
