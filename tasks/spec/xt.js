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

  describe.skip('task: clone', function () {
    it('should clone and npm install public repos without prompting for password', function () {
      xtPhase.clone.beforeTask(options);
      xtPhase.clone.doTask(options);

      var xtupleRepo = fs.existsSync(options.xt.srcdir, 'xtuple'),
        extensionsRepo = fs.existsSync(options.xt.srcdir, 'xtuple-extensions');

      assert.isTrue(xtupleRepo);
      assert.isTrue(extensionsRepo);
    });
    it.skip('should clone and npm install all repos and require password', function () {
      options.xt.edition = 'distribution';
      xtPhase.clone.beforeTask(options);
      xtPhase.clone.doTask(options);

      var xtupleRepo = fs.existsSync(options.xt.srcdir, 'xtuple'),
        extensionsRepo = fs.existsSync(options.xt.srcdir, 'xtuple-extensions'),
        privateRepo = fs.existsSync(options.xt.srcdir, 'private-extensions');

      assert.isTrue(xtupleRepo);
      assert.isTrue(extensionsRepo);
      assert.isTrue(privateRepo);
    });
    it('should clone only public repos if instlaling a free edition', function () {
      var repoList = xtPhase.clone.getRepositoryList(options);

      assert.include(repoList, 'xtuple');
      assert.include(repoList, 'xtuple-extensions');
      assert.notInclude(repoList, 'private-extensions');
    });
    it('should clone all repos if installing a premium edition', function () {
      options.xt.edition = 'manufacturing';
      var repoList = xtPhase.clone.getRepositoryList(options);

      assert.include(repoList, 'xtuple');
      assert.include(repoList, 'xtuple-extensions');
      assert.include(repoList, 'private-extensions');

      options.xt.edition = 'distribution';
      repoList = xtPhase.clone.getRepositoryList(options);

      assert.include(repoList, 'xtuple');
      assert.include(repoList, 'xtuple-extensions');
      assert.include(repoList, 'private-extensions');

      options.xt.edition = 'enterprise';
      repoList = xtPhase.clone.getRepositoryList(options);

      assert.include(repoList, 'xtuple');
      assert.include(repoList, 'xtuple-extensions');
      assert.include(repoList, 'private-extensions');
    });
    afterEach(function () {
      options.xt.edition = 'core';
    });
  });

  describe.skip('task: serverconfig', function () {
    beforeEach(function () {
      exec('mkdir -p __config- ' + options.xt.name);
      exec('mkdir -p __log- ' + options.xt.name);
      xtPhase.serverconfig.beforeTask(options);
    });

    it('should parse and generate a correct config.js', function () {
      var result = xtPhase.serverconfig.doTask(options);

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
