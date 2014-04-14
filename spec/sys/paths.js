var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

it('should create configdir', function () {
  assert.isTrue(fs.existsSync(options.xt.configdir));
});

it('should create homedir', function () {
  assert.isTrue(fs.existsSync('/usr/local/xtmocha'));
});

it('should create postgres pid dir', function () {
  assert.isTrue(fs.existsSync('/var/run/postgresql'));
});

it('should create xtuple state dir', function () {
  assert.isTrue(fs.existsSync('/var/lib/xtuple'));
});

it('should create xtuple log dir', function () {
  assert.isTrue(fs.existsSync('/var/log/xtuple'));
});
