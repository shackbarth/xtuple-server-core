/* jshint node: true */
'use strict';

var assert = require('assert');

var lib = require('xtuple-server-lib');
var plans = require('../plans');
var planner = require('../');
var specPlanner = require('./planner');
var semver = require('semver');
var pkg = require('../package');
var fs = require('fs');
var path = require('path');
var n = require('n-api');
var proc = require('child_process');

global.log = require('npmlog');
log.heading = 'xtuple-server-test';
log.level = 'verbose';

process.on('exit', function () {
  log.info('test', 'Test result details in xtuple-server-test.log');
  fs.appendFileSync('xtuple-server-test.log', JSON.stringify(log.record, null, 2));

  n(process.version);
});

describe('xTuple Server', function () {

  beforeEach(function () {
    log.level = 'verbose';
  });

  it('should be run with node '+ pkg.engines.node, function () {
    assert(semver.satisfies(process.version, pkg.engines.node));
  });

  describe('cli', function () {

    afterEach(function () {
      log.verbose(this.child);
    });

    it('should be installed globally', function () {
      var stdout = proc.execSync('command -v xtuple-server');
      assert(/xtuple-server\n$/.test(stdout));
    });

    describe('@uninstall-dev', function () {
      it('should do something', function () {
        this.child = proc.execSync(
          // local-workspace path relative to ../
          'xtuple-server uninstall-dev --local-workspace node_modules/xtuple --verbose'
        );
      });
    });

  });

  describe('plans', function () {

    describe('@install-dev', function () {
      this.planObject = plans['install-dev'];
      this.options = {
        planName: 'install-dev',
        plan: this.planObject.plan,
        type: 'dev',
        local: {
          workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
        },
        xt: {
          demo: true,
          version: require('../node_modules/xtuple/package').version
        }
      };
      planner.compileOptions(this.options.plan, this.options);
      planner.verifyOptions(this.options.plan, this.options);
      specPlanner.describe(this);
    });

    describe.skip('@backup-database', function () {
      this.planObject = plans['backup-database'];
      this.options = {
        planName: 'backup-database',
        plan: this.planObject.plan,
        type: 'dev',
        local: {
          workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
        },
        xt: {
          version: require('../node_modules/xtuple/package').version
        },
        pg: {
          dbname: 'demo_dev'
        }
      };
      planner.compileOptions(this.options.plan, this.options);
      planner.verifyOptions(this.options.plan, this.options);
      specPlanner.describe(this);
    });

    describe.skip('@drop-database', function () {
      this.planObject = plans['drop-database'];
      this.options = {
        planName: 'drop-database',
        plan: this.planObject.plan,
        type: 'dev',
        local: {
          workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
        },
        xt: {
          version: require('../node_modules/xtuple/package').version
        },
        pg: {
          dbname: 'demo_quickstart'
        }
      };
      planner.compileOptions(this.options.plan, this.options);
      planner.verifyOptions(this.options.plan, this.options);
      specPlanner.describe(this);
    });

    describe.skip('@restore-database', function () {
      this.planObject = plans['restore-database'];
      this.options = {
        planName: 'restore-database',
        plan: this.planObject.plan,
        type: 'dev',
        local: {
          workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
        },
        xt: {
          version: require('../node_modules/xtuple/package').version
        },
        pg: {
          dbname: 'demo_dev_restored'
        }
      };
      this.options.pg.infile = lib.util.getSnapshotPath(this.options, false),
      planner.compileOptions(this.options.plan, this.options);
      planner.verifyOptions(this.options.plan, this.options);
      specPlanner.describe(this);
    });

    describe.skip('@rename-database', function () {
      this.planObject = plans['rename-database'];
      this.options = {
        planName: 'rename-database',
        plan: this.planObject.plan,
        type: 'dev',
        local: {
          workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
        },
        xt: {
          version: require('../node_modules/xtuple/package').version
        },
        pg: {
          dbname: 'demo_dev_restored'
        }
      };
      this.options.pg.infile = lib.util.getSnapshotPath(this.options, false),
      planner.compileOptions(this.options.plan, this.options);
      planner.verifyOptions(this.options.plan, this.options);
      specPlanner.describe(this);
    });
  });
});

