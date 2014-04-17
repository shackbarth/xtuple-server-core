(function () {
  'use strict';

  /**
   * Build test/demo databases
   */
  var build_common = exports;

  var task = require('../../lib/task'),
    xtPhase = require('./index'),
    pgcli = require('../../lib/pg-cli'),
    rimraf = require('rimraf'),
    fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build');

  _.extend(build_common, task, /** @exports build_common */ {

    /** @override */
    beforeTask: function (options) {
    },

    /** @override */
    doTask: function (options) {
    }
  });
})();
