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

process.on('exit', function () {
  log.info('test', 'Test result details in xtuple-server-test.log');
  fs.appendFileSync('xtuple-server-test.log', JSON.stringify(log.record, null, 2));

  n(process.version);
});

describe('xTuple Server', function () {

  beforeEach(function () {
    log.heading = 'xtuple-server-test';
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
      var planObject = plans['install-dev'];
      var options = {
        planName: 'install-dev',
        plan: planObject.plan,
        type: 'dev',
        local: {
          workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
        },
        xt: {
          demo: true,
          version: require('../node_modules/xtuple/package').version
        }
      };
      
      before(function () {
        planner.compileOptions(options.plan, options);
        planner.verifyOptions(options.plan, options);
      });

      specPlanner.describe({ planObject: planObject, options: options });
    });

    describe.skip('@backup-database', function () {
      var planObject = plans['backup-database'];
      var options = {
        planName: 'backup-database',
        plan: planObject.plan,
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

      before(function () {
        planner.compileOptions(options.plan, options);
        planner.verifyOptions(options.plan, options);
      });

      specPlanner.describe({ planObject: planObject, options: options });
    });

    describe.skip('@drop-database', function () {
      var planObject = plans['drop-database'];
      var options = {
        planName: 'drop-database',
        plan: planObject.plan,
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

      before(function () {
        options.pg.infile = lib.util.getSnapshotPath(options, false);
        planner.compileOptions(options.plan, options);
        planner.verifyOptions(options.plan, options);
      });

      specPlanner.describe({ planObject: planObject, options: options });
    });

    describe.skip('@restore-database', function () {
      var planObject = plans['restore-database'];
      var options = {
        planName: 'restore-database',
        plan: planObject.plan,
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

      before(function () {
        options.pg.infile = lib.util.getSnapshotPath(options, false);
        planner.compileOptions(options.plan, options);
        planner.verifyOptions(options.plan, options);
      });

      specPlanner.describe({ planObject: planObject, options: options });
    });

    describe.skip('@rename-database', function () {
      var planObject = plans['rename-database'];
      var options = {
        planName: 'rename-database',
        plan: planObject.plan,
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

      before(function () {
        planner.compileOptions(options.plan, options);
        planner.verifyOptions(options.plan, options);
      });

      specPlanner.describe({ planObject: planObject, options: options });
    });
  });
});

