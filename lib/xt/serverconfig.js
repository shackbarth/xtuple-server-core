(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    exec = require('exec-sync'),
    _ = require('underscore'),
    m = require('mstring'),
    config_template = m(function () {
      /***
        (function () {
          'use strict';

          module.exports = {json};
        })();

      ***/
    });

  var serverconfig = exports;

  _.extend(serverconfig, /** @exports serverconfig */ {

    options: {
      srcdir: {
        optional: '[path]',
        value: '/usr/local/xtuple/src/xtuple',
        description: 'Path to the xtuple source directory'
      },
      configtarget: {
        optional: '[path]',
        description: 'Location of datasource config file',
        value: '/etc/xtuple/{version}/{name}/config.js'
      }
    },

    run: function (options) {
      var xt = options.xt,
        sample_path = path.resolve(xt.srcdir, 'node-datasource/sample_config'),
        output_path = path.resolve(xt.configtarget.format({
          version: xt.version,
          name: options.pg.cluster.name
        })),
        sample_config = require(sample_path),
        sample_obj = JSON.parse(JSON.stringify(sample_config)),
        output_conf;

      _.extend(sample_obj, {
        datasource: _.extend(sample_config.datasource, {
          name: 'xtupleserver',
          databases: options.pg.databases,
          testDatabase: ''
        }),
        databaseServer: {
          hostname: 'localhost',
          port: options.pg.cluster.port,
          user: 'admin',
          password: options.pg.adminpw
        }
      });

      output_conf = config_template.format({ json: JSON.stringify(sample_obj, null, 2) });

      if (options.dry !== true) {
        exec('sudo mkdir -p {dir}'.format({ dir: path.dirname(output_path) }));
        fs.writeFileSync(output_path, output_conf);
      }

      return {
        string: output_conf,
        json: sample_obj,
        path: output_path
      };
    }
  });

})();
