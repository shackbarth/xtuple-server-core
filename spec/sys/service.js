var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

it('should install pm2 binaries', function () {
  assert.equal(exec('stat /usr/bin/pm2').code, 0, 'pm2 binary not properly installed');
  assert.equal(exec('stat /usr/bin/pm2-web').code, 0, 'pm2-web binary not properly installed');
});
