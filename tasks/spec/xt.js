var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore');

describe('phase: xt', function () {
  var options = global.options;

  describe.skip('task: testconfig', function () {
    var testconfig = require('../xt/testconfig');

  });

  describe.skip('task: serverconfig', function () {
    var serverconfig = require('../xt').serverconfig;

    beforeEach(function () {
      exec('mkdir -p __config ' + options.xt.name);
      exec('mkdir -p __log ' + options.xt.name);
      serverconfig.beforeTask(options);
    });

    it('can parse and generate a correct config.js', function () {
      var result = serverconfig.run(options);

      assert.match(result.string, /"testDatabase": "demo"/);
      assert.match(result.string, /"password": "123"/);
      assert.equal(result.json.datasource.databases.length, 1);
    });

    after(function () {
      // XXX weird name testkey
      exec('rm -rf *{testkey}'.format({ testkey: options.xt.name }));
    });
  });

  after(function () {
    exec('rm -rf __*');
  });
});
