var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  _ = require('underscore');

describe('phase: xt', function () {
  var sysPhase = require('../sys'),
    pgPhase = require('../pg'),
    xtPhase = require('../xt'),
    nginxPhase = require('../nginx'),
    planner = require('../../lib/planner'),
    pgcli = require('../../lib/pg-cli'),
    options;

  beforeEach(function () {
    options = global.options;

    planner.verifyOptions(global.baseClusterInstallPlan, options);
    planner.compileOptions(global.baseClusterInstallPlan, options);
    planner.install(global.baseClusterInstallPlan, options);
  });
  afterEach(function () {
    pgcli.dropcluster(options.pg.cluster);
  });

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

  describe('task: clone', function () {
    it('should clone only public repos if installing a free edition', function () {
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
    it.skip('should clone and npm install public repos without prompting for password', function () {
      var xtupleRepo = fs.existsSync(options.xt.srcdir, 'xtuple'),
        extensionsRepo = fs.existsSync(options.xt.srcdir, 'xtuple-extensions');

      assert.isTrue(xtupleRepo);
      assert.isTrue(extensionsRepo);
    });
    afterEach(function () {
      options.xt.edition = 'core';
    });
  });
  describe.skip('task: clone [requires password]', function () {
    this.pending = !!process.env.TRAVIS;

    it('should clone and npm install all repos and require password', function () {
      options.xt.edition = 'distribution';

      var xtupleRepo = fs.existsSync(options.xt.srcdir, 'xtuple'),
        extensionsRepo = fs.existsSync(options.xt.srcdir, 'xtuple-extensions'),
        privateRepo = fs.existsSync(options.xt.srcdir, 'private-extensions');

      assert.isTrue(xtupleRepo);
      assert.isTrue(extensionsRepo);
      assert.isTrue(privateRepo);
    });
  });

  describe.skip('task: serverconfig', function () {
    beforeEach(function () {
      exec('mkdir -p __config- ' + options.xt.name);
      exec('mkdir -p __log- ' + options.xt.name);
    });

    it('should parse and generate a correct config.js', function () {
      assert.match(options.xt.serverconfig.string, /"testDatabase": "demo"/);
      assert.match(options.xt.serverconfig.string, /"password": "123"/);
      assert.equal(options.xt.serverconfig.json.datasource.databases.length, 1);
    });

    after(function () {
      exec('rm -rf *-{xt.name}*'.format(options));
    });
  });

  after(function () {
    exec('rm -rf __*');
  });
});
