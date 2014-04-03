var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore');

describe('phase: xt', function () {
  var xtPhase = require('../xt'),
    options = global.options;

  it('is sane', function () {
    assert(xtPhase);
    assert(xtPhase.database);
    assert(xtPhase.build_main);
    assert(xtPhase.build_common);
    assert(xtPhase.serverconfig);
    assert(xtPhase.testconfig);
  });

  describe.skip('task: testconfig', function () {

  });

  describe.skip('task: serverconfig', function () {
    beforeEach(function () {
      exec('mkdir -p __config- ' + options.xt.name);
      exec('mkdir -p __log- ' + options.xt.name);
      xtPhase.serverconfig.beforeTask(options);
    });

    it('can parse and generate a correct config.js', function () {
      var result = xtPhase.serverconfig.run(options);

      assert.match(result.string, /"testDatabase": "demo"/);
      assert.match(result.string, /"password": "123"/);
      assert.equal(result.json.datasource.databases.length, 1);
    });

    after(function () {
      exec('rm -rf *-{xt.name}*'.format(options));
    });
  });

  after(function () {
    exec('rm -rf __*');
  });
});
