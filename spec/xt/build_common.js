var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  path = require('path'),
  exec = require('execSync').exec,
  options = global.options;

describe('build demo database', function () {
  this.pending = !process.env.TRAVIS;

  it.skip('should be able to read build config file', function () {
    assert.match(fs.canRead(options.xt.buildconfigfile));
  });
  it('usersrc should contain node_modules binaries', function () {
    assert(fs.existsSync(path.resolve(options.xt.usersrc, 'node_modules/.bin')));
  });
  it('usersrc should contain demo-test.backup in test/lib', function () {
    assert(fs.existsSync(path.resolve(options.xt.usersrc, 'test/lib/demo-test.backup')));
  });
});
