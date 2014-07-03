require('node-version-magic').enforce(require('../package'), function (e, version) {
  'use strict';

  if (e) throw Error(e);

  var pkg = require('../package');
  var _ = require('lodash');
  var semver = require('semver');
  var fs = require('fs');
  var path = require('path');
  var Mocha = require('mocha');
  var glob = require('glob');
  var n = require('n-api');

  global.log = require('npmlog');
  log.heading = 'xtuple-server';
  log.level = 'verbose';

  process.on('exit', function () { n(version); });

  _.each(glob.sync(path.resolve(process.cwd(), 'spec/*.js')), function (spec) {
    require(spec);
  });

});
