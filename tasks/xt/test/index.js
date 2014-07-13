var lib = require('xtuple-server-lib'),
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs');

/**
 * Generate the login_data file
 */
_.extend(exports, lib.task, /** @exports xtuple-server-xt-test */ {

  /** @override */
  executeTask: function (options) {
    if (options.xt.demo) {
      options.xt.testdb = 'demo_' + options.type;
      exports.writeLoginData(options);
    }
    fs.symlinkSync(options.xt.configfile, path.resolve(options.xt.coredir, 'node-datasource/config.js'));
  },

  writeLoginData: function (options) {
    fs.writeFileSync(path.resolve(options.xt.coredir, 'test/lib/login_data.json'), JSON.stringify({
      data: {
        webaddress: 'https://' + options.nginx.hostname + ':' + options.nginx.httpsport,
        username: 'admin',
        pwd: options.xt.adminpw,
        org: options.xt.testdb
      }
    }, null, 2));
  },
});
