var assert = require('assert'),
  _ = require('lodash'),
  fs = require('fs');

exports.afterExecute = function (options) {
  it('should add an entry in /etc/hosts', function () {
    var etchosts = fs.readFileSync('/etc/hosts').toString();

    assert(
      new RegExp(options.nginx.sitename).test(etchosts),
      'site name seems not to have been added to etc/hosts'
    );
  });
};
