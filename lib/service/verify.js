(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('exec-sync'),
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
      // TODO implement
    }
  });

})();
