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
      var xt = options.xt,
        input_path = path.resolve(xt.coredir, 'test/lib/sample_login_data'),
        output_path = path.resolve(xt.coredir, 'test/lib/login_data.js'),
        test_config = require(input_path),
        test_obj = JSON.parse(JSON.stringify(test_config)),
        output_obj = {
          webaddress: 'https://{domain}:443'.format({ domain: options.nginx.domain }),
          username: 'admin',
          pwd: xt.adminpw,
          org: 'demo'
        },
        output_config = testconfig.config_template.format({
          params: options.xt,
          json: JSON.stringify(test_obj, null, 2)
        });

      fs.writeFileSync(output_path, output_config);

      return options;
    }
  });
})();
