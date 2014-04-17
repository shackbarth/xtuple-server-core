var assert = require('chai').assert,
  exec = require('execSync').exec,
  _ = require('underscore'),
  path = require('path'),
  fs = require('fs'),
  planner = require('../lib/planner'),
  pgcli = require('../lib/pg-cli');

describe('xTuple Installer', function () {
  global.options = {
      plan: 'install',
      xt: {
        name: 'xtmocha',
        version: '4.4.0',
        demo: true,
        quickstart: true
      },
      pg: {
        version: process.env.XT_PG_VERSION,
        mode: 'dedicated'
      }
    };

  // palindromic install plans are my favorite kinds of install plans
  global.installPlan = [
    {name: 'sys', tasks: [ 'paths', 'policy' ]},
    {name: 'xt', tasks: [ 'clone' ]},
    {name: 'pg', tasks: [ 'config', 'cluster' ]},
    {name: 'nginx', tasks: [ 'ssl', 'site', 'etchosts' ]},
    {name: 'pg', tasks: [ 'hba', 'tuner', 'snapshotmgr' ]},
    {name: 'xt', tasks: [ 'serverconfig', 'database' ]},
    {name: 'sys', tasks: [ 'cups', 'service' ]}
  ];

  // XXX remove this when zombie is fixed in node 0.10
  if (!!process.env.TRAVIS && (process.env.XT_NODE_VERSION || '').indexOf('0.10') === -1) {
    global.installPlan.push({name: 'xt', tasks: [ 'testconfig', 'runtests' ]});
  }

  describe('#uninstall', function () {
    it('should pre-run uninstall on any existing installation', function () {
      planner.eachTask(global.installPlan, function (task, phaseName, taskName) {
        try {
          task.uninstall(_.defaults({
            pg: _.extend({
              cluster: {
                version: process.env.XT_PG_VERSION,
                name: global.options.xt.name
              }
            }, global.options.pg)
          }, global.options));
        }
        catch (e) {
          //console.log('benign: '+ e.message);
        }
      });

    });
  });

  it('must run with root privileges', function () {
    assert(
      exec('id -u').stdout.indexOf('0') === 0,
      'installer tests must be run with sudo'
    );
  });
  it('must set XT_PG_VERSION environment variable', function () {
    assert.include([ '9.1', '9.3' ], String(process.env.XT_PG_VERSION));
  });

  describe('setup', function () {
    describe('#verifyOptions, #compileOptions', function () {
      before(function () {
        planner.verifyOptions(global.installPlan, global.options);
        planner.compileOptions(global.installPlan, global.options);
      });

      it('should compile options defaults', function () {
        assert(global.options.nginx.domain);
        assert.equal(global.options.xt.edition, 'core');
      });
      it('should create empty objects for tasks', function () {
        assert.isObject(global.options.xt.serverconfig);
        assert.isObject(global.options.sys.paths);
        assert.isObject(global.options.pg.config);
      });
    });
    describe('#beforeInstall', function () {
      before(function () {
        planner.eachTask(global.installPlan, function (task, phaseName, taskName) {
          task.beforeInstall(global.options);
        });
      });
      it('should run all #beforeInstall methods', function () { });
    });
  });

  describe('install', function () {
    describe('tasks', function () {
      // load tests for install plan
      planner.eachTask(global.installPlan, function (task, phaseName, taskName) {
        describe(phaseName + '.' + taskName, function () {
          before(function () {
            // run installer tasks
            task.beforeTask(global.options);
            task.doTask(global.options);
            task.afterTask(global.options);
          });

          it('should be sane', function () {
            assert(task);
            assert(global.options);
          });

          require(path.resolve('spec', phaseName, taskName));
        });
      });
    });

    describe('#afterInstall', function () {
      it('should run all #afterInstall methods', function () {
        planner.eachTask(global.installPlan, function (task, phaseName, taskName) {
          task.afterInstall(global.options);
        });
      });
    });

  });
});
