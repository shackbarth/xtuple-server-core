var lib = require('xtuple-server-lib'),
  _ = require('lodash'),
  fs = require('fs'),
  path = require('path'),
  os = require('os'),
  hosts_template_path = path.resolve(__dirname, 'etc-hosts.template');

/**
 * Append entries to the system hosts file if necessary.
 */
_.extend(exports, lib.task, /** @exports hosts */ {

  /** @override */
  executeTask: function (options) {
    var template = fs.readFileSync(hosts_template_path).toString(),
      customerRegex = 'customer=' + options.xt.name,
      versionRegex = 'version=' + options.xt.version,
      hosts = fs.readFileSync(path.resolve('/etc/hosts').toString());


    if (new RegExp(customerRegex).test(hosts) && new RegExp(versionRegex).test(hosts)) {
      // do nothing. the necessary host entry already exists
    }
    else {
      fs.appendFileSync(path.resolve('/etc/hosts'), template.format(options));
    }
  },

  /** @override */
  uninstall: function (options) {
    // TODO implement
    // TODO remove hosts entries
  }
});
