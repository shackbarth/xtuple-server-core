(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    m = require('mstring'),
    path = require('path');

  var configure = exports;

  _.extend(configure, /** @exports config */ {

    /** @static */
    run: function (options) {
      exec('sudo -u xtuple npm install -g forever');

    }

  });
})();
