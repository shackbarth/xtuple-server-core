var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

it('should write valid sudoers files', function () {
  assert(exec('visudo -c').code === 0);
});

it('should create user account', function () {
  assert.equal(exec('id '+ options.xt.name).code, 0);
});

it('should write ssh config', function () {
  var sshd_config = fs.readFileSync('/etc/ssh/sshd_config').toString();

  assert.match(sshd_config, /PermitRootLogin no/);
  assert.match(sshd_config, /xtuser/);
});
