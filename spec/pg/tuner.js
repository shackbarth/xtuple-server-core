var assert = require('chai').assert,
  _ = require('lodash'),
  exec = require('execSync').exec,
  lib = require('../../lib'),
  options = global.options;

it.skip('should generate correct values', function () {
  var postgresql_conf = options.pg.config;

});
it.skip('should generate a verifiably-correct postgresql.conf', function () {
  var restart = lib.pgCli.ctlcluster(_.extend({ action: 'reload' }, options.pg.cluster));
  assert.equal(restart.code, 0);
});

