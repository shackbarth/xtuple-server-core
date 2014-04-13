/* global options */

var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  rimraf = require('rimraf'),
  format = require('string-format'),
  path = require('path'),
  _ = require('underscore');

describe('phase: xt', function () {
  var sysPhase = require('../sys'),
    pgPhase = require('../pg'),
    xtPhase = require('../xt'),
    nginxPhase = require('../nginx'),
    planner = require('../../lib/planner'),
    pgcli = require('../../lib/pg-cli');

  it('is sane', function () {
    assert(xtPhase);
    assert(xtPhase.database);
    assert(xtPhase.build_main);
    assert(xtPhase.build_common);
    assert(xtPhase.serverconfig);
    assert(xtPhase.testconfig);
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

  describe('task: testconfig', function () {
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

  });

  describe('task: serverconfig', function () {
    beforeEach(function () {
      var plan = global.baseInstall;
      planner.verifyOptions(plan, options);
      planner.compileOptions(plan, options);
      planner.install(plan, options);
    });

    it('should parse and generate a correct config.js', function () {
      assert.match(options.xt.serverconfig.string, new RegExp('"user": "{xt.name}"'.format(options)));
    });
  });

  describe('task: build_app [quickstart]', function () {
    // only run this suite in CI; too time-consuming to always run locally
    //this.pending = !process.env.TRAVIS;

    beforeEach(function () {
      var plan = global.baseInstall.concat(global.appInstall);
      planner.verifyOptions(plan, options);
      planner.compileOptions(plan, options);
      planner.install(plan, options);
    });

    it.skip('should build and mobilize postbooks "quickstart" database by default', function () {
      var quickstartCreate = pgcli.createdb(_.extend({ owner: options.xt.name, dbname: 'quickstart' }, options));

      assert.notEqual(quickstartCreate.code, 0);
      assert.match(quickstartCreate.stdout, /already exists/);
    });
  });
  describe('task: runtests', function () {
    // skip this test if not in CI
    //this.pending = !process.env.TRAVIS;

    beforeEach(function () {
      var plan = global.baseInstall.concat(global.appInstall).concat(global.appInstallTest);

      options.xt.quickstart = false;
      options.xt.demo = true;

      planner.verifyOptions(plan, options);
      planner.compileOptions(plan, options);
      planner.install(plan, options);
    });
    it('should pass core unit tests on postbooks_demo database', function () {
      assert.isTrue(options.xt.runtests.core);
    });
  });
});
