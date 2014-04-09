(function () {
  'use strict';

  /**
   * Generate the config file for the testing framework.
   */
  var testconfig = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    m = require('mstring');

  _.extend(testconfig, task, /** @exports testconfig */ {

    config_template: m(function () {
      /***

      // {params}
      exports.data = {json};

      ***/
    }),

    /** @override */
    doTask: function (options) {
      var output_path = path.resolve(options.xt.configdir, 'test/lib/login_data.js'),
        output_obj = {
          data: {
            webaddress: 'https://{nginx.domain}:{options.xt.port}'.format({ domain: options.nginx.domain }),
            username: 'admin',
            pwd: options.xt.adminpw,
            org: 'demo'
          }
        },
        output_config = testconfig.config_template.format({
          json: JSON.stringify(output_obj, null, 2)
        });

      fs.writeFileSync(output_path, output_config);
    }
  });
})();
