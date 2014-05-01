var assert = require('chai').assert,
  _ = require('lodash'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

describe('demo unit tests', function () {
  this.pending = !process.env.TRAVIS;

  it('should pass core unit tests on postbooks_demo database', function () {
    assert.isTrue(options.xt.runtests.core);
  });
});
