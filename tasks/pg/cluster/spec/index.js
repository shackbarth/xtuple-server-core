var assert = require('chai').assert,
  _ = require('lodash'),
  exec = require('child_process').execSync;

exports.afterExecute = function (options) {

  it('pg.cluster.name should be set correctly', function () {
    var scalarVersion = options.xt.version.replace(/\./g, '');
    assert.match(options.pg.cluster.name, new RegExp(options.xt.name + "-" + scalarVersion + "-"));
  });

  it('should be able to control my personal pg cluster', function () {
    exec('sudo -u {xt.name} pg_ctlcluster {pg.version} {pg.cluster.name} reload'
      .format(options));
  });
};
