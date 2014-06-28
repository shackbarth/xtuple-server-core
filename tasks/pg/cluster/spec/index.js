var assert = require('chai').assert,
  _ = require('lodash'),
  exec = require('sync-exec');

exports.afterExecute = function (options) {

  it('pg.cluster.name should be set correctly', function () {
    var scalarVersion = options.xt.version.replace(/\./g, '');
    assert.match(options.pg.cluster.name, new RegExp(options.xt.name + "-" + scalarVersion + "-"));
  });

  it('should be able to control my personal pg cluster', function () {
    var result = exec('sudo -u {xt.name} pg_ctlcluster {pg.version} {pg.cluster.name} reload'
      .format(options));

    assert.equal(result.status, 0, 'Cannot restart cluster: '+ JSON.stringify(result));
  });
};
