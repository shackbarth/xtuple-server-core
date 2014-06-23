var lib = require('xtuple-server-lib'),
  format = require('string-format'),
  exec = require('execSync').exec,
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs');

/**
 * Generate the login_data.js file
 */
_.extend(exports, lib.task, /** @exports xtuple-server-xt-test */ {

  /** @override */
  executeTask: function (options) {
    exports.writeLoginData(options);
  },

  /** @override */
  afterTask: function (options) {
    options.xt.testdb = 'xtuple_demo';
  },

  writeLoginData: function (options) {
    fs.writeFileSync(path.resolve(options.xt.coredir, 'test/lib/login_data.json'), JSON.stringify({
      data: {
        webaddress: 'https://' + options.nginx.hostname + ':' + options.nginx.httpsport,
        username: 'admin',
        pwd: options.xt.adminpw,
        org: 'xtuple_demo'
      }
    }, null, 2));
  },
});
