(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('exec-sync'),
    sync = require('sync');

  var runtests = exports;

  _.extend(runtests, /** @exports runtests */ {

    options: {
      runtests: {
        optional: '[boolean]',
        description: 'Whether to require all tests to pass before certifying this installation',
        value: true
      }
    }
  });

})();
