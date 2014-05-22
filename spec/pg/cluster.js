var assert = require('chai').assert,
  _ = require('lodash'),
  exec = require('execSync').exec,
  options = global.options;

it('pg.cluster.name should be set correctly', function () {
  assert.equal(options.pg.cluster.name, options.xt.name + '-' + options.xt.version);
});

it('should be able to control my personal pg cluster', function () {
  var result = exec('sudo -u {xt.name} pg_ctlcluster {pg.version} {pg.cluster.name} reload'
    .format(options));

  assert.equal(result.code, 0, 'Cannot restart cluster: '+ JSON.stringify(result));
});

