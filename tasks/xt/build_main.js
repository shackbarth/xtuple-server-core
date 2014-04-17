(function () {
  'use strict';

  /**
   * Mobile-ize the main databases
   */
  var build_main = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    rimraf = require('rimraf'),
    fs = require('fs'),
    pgcli = require('../../lib/pg-cli'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build');

  _.extend(build_main, task, /** @exports build_main */ {

    /** @override */
    beforeTask: function (options) {
      require('./build_common').beforeTask(options);
    },

    /** @override */
    doTask: function (options) {
    }
  });
})();
