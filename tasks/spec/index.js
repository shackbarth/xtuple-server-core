var assert = require('chai').assert,
  exec = require('execSync').exec;

describe('xTuple Installer', function () {

  before(function () {
    assert(
      exec('id -u').stdout.indexOf('0') === 0,
      'installer tests must be run with sudo'
    );
  });

  require('./sys');
  require('./pg');
  require('./nginx');
  require('./xt');
});
