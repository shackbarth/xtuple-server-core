var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

it('should install pm2 binaries', function () {
  assert.equal(exec('stat /usr/bin/pm2').code, 0, 'pm2 binary not properly installed');
  assert.equal(exec('stat /usr/bin/pm2-web').code, 0, 'pm2-web binary not properly installed');
});

it('all pm2 services accounted for (server, healthfeed, snapshotmgr)', function () {
  var pm2config = JSON.parse(fs.readFileSync(options.sys.pm2.configfile).toString());
  assert.lengthOf(pm2config, 3);
});

