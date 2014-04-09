/* global options */

var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
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
    beforeEach(function () {
      var plan = global.baseClusterInstallPlan;
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
      var plan = global.baseClusterInstallPlan.concat(global.baseAppInstallPlan);
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
  describe('task: build_app [maindb = demo.backup]', function () {
    beforeEach(function () {
      var plan = global.baseClusterInstallPlan.concat(global.mainAppInstallPlan),
        url = 'http://sourceforge.net/projects/postbooks/files/' +
            '03%20PostBooks-databases/{xt.version}/postbooks_demo-{xt.version}.backup/download',
        maindb_path = path.resolve('demo.backup');

      options.xt.maindb = maindb_path;
      options.xt.setupdemos = false;

      planner.verifyOptions(plan, options);
      planner.compileOptions(plan, options);

      console.log(options.xt.version);
      console.log(url.format(options));
      
      exec('wget -qO '+ maindb_path +' '+ url.format(options));

      planner.install(plan, options);
    });
    it('should pass core unit tests', function () {
      var lnConfig = exec('ln -s {xt.configfile} {xt.coredir}/node-datasource/config.js'.format(options)),
        lnLogin = exec('ln -s {xt.configdir}/test/lib/login_data.js {xt.coredir}/test/lib/login_data.js'.format(options));

      assert.equal(lnConfig.code, 0, lnConfig.stdout);
      assert.equal(lnLogin.code, 0, lnLogin.stdout);

      var testResults = exec('cd {xt.coredir} && npm test'.format(options));

      assert.equal(testResults.code, 0, testResults.stdout);
    });
    afterEach(function () {
      /*
      try {
        fs.unlinkSync(path.resolve(options.xt.coredir, 'node-datasource/config.js'));
        fs.unlinkSync(path.resolve(options.xt.coredir, 'test/lib/login_data.js'));
      }
      catch (e) {

      }
      */
    });
  });
});
