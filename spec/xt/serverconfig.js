var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

describe('config.js', function () {
  it.skip('should be able to read config.js file', function () {
    assert.match(fs.canRead(options.xt.configfile));
  });
  it('should set user to the customer name', function () {
    assert.match(options.xt.serverconfig.string, new RegExp('"user": "{xt.name}"'.format(options)));
  });
  it('should generate a correct config.js', function () {
    assert.match(options.xt.serverconfig.string, new RegExp('"user": "{xt.name}"'.format(options)));
  });
});
it.skip('should be able to read rand64 file', function () {
  assert.match(fs.canRead(options.xt.rand64file));
});
it.skip('should be able to read key256 file', function () {
  assert.match(fs.canRead(options.xt.key256file));
});
