var assert = require('chai').assert,
  exec = require('execSync').exec,
  _ = require('lodash'),
  lib = require('xtuple-server-lib'),
  path = require('path'),
  fs = require('fs'),
  planner = lib.planner;

describe('xTuple Installer', function () {
  global.options = {
      planName: 'install-pilot',
      xt: {
        name: 'xtmocha',
        version: '4.4.1',
        demo: true
      },
      pg: {
        version: process.env.XT_PG_VERSION,
        capacity: 32
      }
    };

  it('must run with root privileges', function () {
    assert(
      exec('id -u').stdout.indexOf('0') === 0,
      'installer tests must be run with sudo'
    );
  });

  // palindromic install plans are my favorite kinds of install plans
  global.installPlan = [
    {name: 'sys', tasks: [ 'paths', 'policy' ]},
    {name: 'pg', tasks: [ 'cluster' ]},
    {name: 'nginx', tasks: [ 'ssl', 'site', 'hosts' ]},
    {name: 'pg', tasks: [ 'hba', 'config' ]},
    {name: 'xt', tasks: [ 'install', 'config', 'database' ]},
    {name: 'sys', tasks: [ 'report' ]}
  ];

  describe('planner', function () {
    describe('#execute', function () {
      it('should return resolved promise', function (done) {
        planner.execute([ ], { planName: 'promise-test' })
          .then(function () {
            done();
          })
          .fail(function (e) {
            assert.fail(e);
          });
      });
    });
    describe('#uninstall', function () {
      it('should uninstall any existing installation', function (done) {
        this.timeout(300 * 1000); // 5 minutes
        planner.execute(global.installPlan, _.defaults({
            planName: 'uninstall',
            pg: _.extend({
              cluster: {
                version: process.env.XT_PG_VERSION,
                name: global.options.xt.name
              }
            }, global.options.pg)
          }, global.options)
        ).then(function () {
          done();
        })
        .fail(function (e) {
          assert.fail(e);
        });
      });
    });
  });

  describe('setup', function () {
    describe('#verifyOptions, #compileOptions', function () {
      before(function () {
        planner.compileOptions(global.installPlan, global.options);
        planner.verifyOptions(global.installPlan, global.options);
      });

      it('should compile options defaults', function () {
        assert(global.options.nginx.domain);
        assert.equal(global.options.xt.edition, 'core');
      });
      it('should create empty objects for tasks', function () {
        assert.isObject(global.options.xt.config);
        assert.isObject(global.options.sys.paths);
        assert.isObject(global.options.pg.config);
      });
    });
    describe('#beforeInstall', function () {
      before(function () {
        planner.eachTask(global.installPlan, function (task, phase, taskName) {
          task.beforeInstall(global.options);
        });
      });
      it('should run all #beforeInstall methods', function () { });
    });
  });

  describe('execute', function () {
    describe('tasks', function (done) {
      this.timeout(900 * 1000); // 15 minutes

      planner.eachTask(global.installPlan, function (task, phase, taskName) {
        describe(phase.name + '.' + taskName, function () {
          it('should be sane', function (done) {
            assert(task);
            assert(global.options);
            done();
          });
          describe('#beforeTask', function (done) {
            it('should complete without error', function (done) {
              task.beforeTask(global.options);
              done();
            });
          });
          describe('#executeTask', function (done) {
            it('should complete without error', function (done) {
              task.executeTask(global.options);
              done();
            });
          });
          describe('#afterTask', function (done) {
            it('should complete without error', function (done) {
              task.afterTask(global.options);
              done();
            });
          });
          describe('spec', function () {
            require(path.resolve('spec', phase.name, taskName));
          });
        });
      });
    });

    describe('#afterInstall', function () {
      it('should run all #afterInstall methods', function () {
        planner.eachTask(global.installPlan, function (task, phase, taskName) {
          task.afterInstall(global.options);
        });
      });
    });
  });
});
