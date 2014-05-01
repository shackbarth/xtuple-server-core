var assert = require('chai').assert,
  _ = require('lodash'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

describe('config.js', function () {
  it.skip('should be able to read config.js file', function () {
    assert.match(fs.canRead(options.xt.configfile));
  });
  it('should set login user to admin', function () {
    assert.match(options.xt.serverconfig.string, new RegExp('"user": "admin"'));
  });
});
it.skip('should be able to read rand64 file', function () {
  assert.match(fs.canRead(options.xt.rand64file));
});
it.skip('should be able to read key256 file', function () {
  assert.match(fs.canRead(options.xt.key256file));
});
