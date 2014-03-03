(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    m = require('mstring'),
    wd = __dirname,
    config_template = m(function () {
      /***
        (function () {
          'use strict';
          module.exports = {json};
        })();

      ***/
    });

  var serverconfig = exports;

  _.extend(serverconfig, /** @exports server-config */ {

    options: {
      srcdir: {
        optional: '[path]',
        value: '/usr/local/xtuple/src/xtuple',
        description: 'Path to the xtuple source directory'
      }
    },

    run: function (options) {
      console.log(options);
      var sample_config = require(
          path.resolve(options.srcdir, 'node-datasource/sample_config')
        ),
        sample_obj = JSON.parse(JSON.stringify(sample_config));

      _.extend(sample_obj, {
        datasource: _.extend(sample_config.datasource, {
          name: 'xtuple-server',
          databases: options.pg.databases,
          testDatabase: ''
        }),
        databaseServer: {
          hostname: 'localhost',
          port: options.pg.cluster.port,
          user: 'admin',
          password: options.pg.dbadminpw
        }
      });
    }
  });

})();
