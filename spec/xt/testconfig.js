var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

it('should create correct login_data file in configdir', function () {
  var login_data = require(options.xt.testloginfile);

  assert.equal(login_data.data.pwd, options.xt.adminpw);
  assert.equal(login_data.data.org, 'xtuple_demo');
});
it('should create correct test/config.js file in configdir', function () {
  var config = require(options.xt.testconfigfile);

  assert.isUndefined(config.databaseServer.password);
  assert.equal(config.datasource.testDatabase, 'xtuple_demo');
});
