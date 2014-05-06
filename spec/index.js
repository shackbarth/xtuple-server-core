var assert = require('chai').assert,
  exec = require('execSync').exec,
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs'),
  planner = require('../lib/planner'),
  pgcli = require('../lib/pg-cli');

describe('xTuple Installer', function () {
  global.options = {
      plan: 'install',
      xt: {
        name: 'xtmocha',
        version: require('../package').version,
        demo: 'yes'
      },
      pg: {
        version: process.env.XT_PG_VERSION,
        capacity: 8
      }
    };

  it('must run with root privileges', function () {
    assert(
      exec('id -u').stdout.indexOf('0') === 0,
      'installer tests must be run with sudo'
    );
  });

  describe('planner', function () {
    describe('#execute', function () {
      it('should return resolved promise', function (done) {
        planner.execute([ ], { })
          .then(function () {
            done();
          })
          .fail(function (e) {
            assert.fail(e);
          });
      });
    });
  });

  // palindromic install plans are my favorite kinds of install plans
  global.installPlan = [
    {name: 'sys', tasks: [ 'paths', 'policy' ]},
    {name: 'xt', tasks: [ 'clone' ]},
    {name: 'pg', tasks: [ 'cluster' ]},
    {name: 'nginx', tasks: [ 'ssl', 'site', 'etchosts' ]},
    {name: 'pg', tasks: [ 'hba', 'tuner', 'config' ]},
    {name: 'xt', tasks: [ 'serverconfig', 'testconfig', 'database' ]},
    {name: 'sys', tasks: [ 'cups', 'service', 'report' ]}
  ];

  // XXX remove this check when zombie is fixed in node 0.10
  //if (!!process.env.TRAVIS && (process.env.XT_NODE_VERSION || '').indexOf('0.10') === -1) {
    //global.installPlan.push({name: 'xt', tasks: [ 'testconfig', 'runtests' ]});
  //}

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
          // uninstall tasks are allowed to fail
        }
      }, global.options);
    });
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

  describe('execute', function () {
    describe('tasks', function (done) {
      this.timeout(900 * 1000); // 15 minutes

      planner.eachTask(global.installPlan, function (task, phaseName, taskName) {
        describe(phaseName + '.' + taskName, function () {
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
          describe('#doTask', function (done) {
            it('should complete without error', function (done) {
              task.doTask(global.options);
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
            require(path.resolve('spec', phaseName, taskName));
          });
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
