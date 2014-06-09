var assert = require('chai').assert,
  _ = require('lodash'),
  fs = require('fs'),
  options = global.options;

it('should add an entry in /etc/hosts', function () {
  var etchosts = fs.readFileSync('/etc/hosts').toString();

  assert.match(etchosts, new RegExp(options.nginx.sitename));
});
