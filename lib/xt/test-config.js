(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
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

  var testconfig = exports;

  _.extend(testconfig, /** @exports server-config */ {
    run: function (options) {
      return options;
    }
  });

})();
