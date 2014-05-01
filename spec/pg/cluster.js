var assert = require('chai').assert,
  _ = require('lodash'),
  exec = require('execSync').exec,
  options = global.options;

it('should be able to control my personal pg cluster', function () {
  var result = exec('sudo -u {xt.name} pg_ctlcluster {pg.version} {xt.name} reload'.format(options));

  assert.equal(result.code, 0, 'Cannot restart cluster. This is usually due to permissions isssues in /var/run/postgresql: '+ JSON.stringify(result));
});

