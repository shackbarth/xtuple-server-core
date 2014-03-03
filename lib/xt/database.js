(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    m = require('mstring');

  var database = exports;

  _.extend(database, /** @exports database */ {
    run: function (options) {
      return options;
    }
  });
})();
