var assert = require('chai').assert,
  _ = require('lodash'),
  fs = require('fs');

exports.afterTask = function (options) {

  it.skip('should be able to read config.js file', function () {
    assert.match(fs.canRead(options.xt.configfile));
  });
  it.skip('should be able to read rand64 file', function () {
    assert.match(fs.canRead(options.xt.rand64file));
  });
  it.skip('should be able to read key256 file', function () {
    assert.match(fs.canRead(options.xt.key256file));
  });

};
