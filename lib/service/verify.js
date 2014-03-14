(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    fs = require('fs'),
    exec = require('execSync').exec,
    sync = require('sync');

  var verify = exports;

  _.extend(verify, /** @exports verify */ {

    options: {
      verify: {
        optional: '[boolean]',
        description: 'Whether to require all tests to pass before certifying this installation',
        value: true
      }
    },
      
    run: function (options) {
      var xt = options.xt;

      var result = exec('cd {appdir} && npm test'.format({
        appdir: path.resolve(xt.appdir)
      }));

      fs.writeFileSync(path.resolve('install.log'), result.stdout);

      return result;
    }
  });

})();
