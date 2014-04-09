/* global options */

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

  describe.skip('task: testconfig', function () {

  });

  describe('task: serverconfig', function () {
    it('should parse and generate a correct config.js', function () {
      assert.match(options.xt.serverconfig.string, new RegExp('"user": "{xt.name}"'.format(options)));
    });
  });

  describe('task: build_common', function () {
    // only run this suite in CI; too time-consuming to always run locally
    //this.pending = !process.env.TRAVIS;

    beforeEach(function () {
      var plan = global.baseClusterInstallPlan.concat(global.baseAppInstallPlan);
      planner.verifyOptions(plan, options);
      planner.compileOptions(plan, options);
      planner.install(plan, options);
    });

    it('should build and mobilize postbooks "quickstart" database by default', function () {
      var quickstartCreate = pgcli.createdb(_.extend({ owner: options.xt.name, dbname: 'quickstart' }, options));

      assert.notEqual(quickstartCreate.code, 0);
      assert.match(quickstartCreate.stdout, /already exists/);
    });

    it.skip('should pass core unit tests', function () {
      exec('ln -s {xt.configfile} {xt.coredir}/node-datasource/config.js');
      exec('ln -s {xt.configdir}/test/lib/login_data.js {xt.coredir}/test/lib/login_data.js');
      var testResults = exec('cd {xt.coredir} && npm test');

      assert.equal(testResults.code, 0);
    });
  });
  describe.skip('task: build_main', function () {
    // only run this suite in CI; too time-consuming to always run locally
    //this.pending = !process.env.TRAVIS;
    beforeEach(function () {
      var plan = global.baseClusterInstallPlan.concat(global.baseAppInstallPlan).concat(global.mainAppInstallPlan);
      planner.verifyOptions(plan, options);
      planner.compileOptions(plan, options);
      planner.install(plan, options);
    });

    it('should build and "mobile-ize" database from .backup file if given', function () {
      //var demoCreate = pgcli.createdb(_.extend({ owner: options.xt.name, dbname: 'demo' }, options)),

    });
    it('should build database from .sql file if given', function () {

    });
  });
});
