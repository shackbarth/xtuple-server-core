var lib = require('xtuple-server-lib'),
  assert = require('chai').assert,
  _ = require('lodash'),
  planner = require('../'),
  log = require('npmlog');

log.heading = 'xtuple-server-test';

function getPackageName (phaseName, taskName) {
  return 'xtuple-server-' + phaseName + '-' + taskName;
}

exports.describe = function (parent) {
  var options = JSON.parse(JSON.stringify(parent.options));
  var planObject = JSON.parse(JSON.stringify(parent.planObject));
  var plan = planObject.plan;

  it.skip(planObject.description);

  before(function () {
    planner.compileOptions(plan, options);
    planner.verifyOptions(plan, options);
  });

  describe('before execute', function () {

    lib.util.eachTask(plan, function (task, phase, taskName) {
      it(getPackageName(phase.name, taskName) + '#beforeInstall', function () {
        task.beforeInstall(options);
      });
    });

    lib.util.eachTask(plan, function (task, phase, taskName) {
      var pkgName = getPackageName(phase.name, taskName);
      var spec = require(pkgName + '/spec');
      if (_.isFunction(spec.beforeExecute)) {
        spec.beforeExecute(options);
      }
    });
  });

  describe('execute', function () {
    
    lib.util.eachTask(plan, function (task, phase, taskName) {
      var pkgName = getPackageName(phase.name, taskName);
      var spec = require(pkgName + '/spec');

      describe(pkgName, function () {

        it('#beforeTask, #executeTask, #afterTask', function () {
          task.beforeTask(options);
          task.executeTask(options);
          task.afterTask(options);
        });

        if (_.isFunction(spec.afterTask)) {
          spec.afterTask(options);
        }
      });
    });
  });

  describe('after execute', function () {

    lib.util.eachTask(plan, function (task, phase, taskName) {
      it(getPackageName(phase.name, taskName) + '#afterInstall', function () {
        task.afterInstall(options);
      });
    });

    lib.util.eachTask(plan, function (task, phase, taskName) {
      var pkgName = getPackageName(phase.name, taskName);
      var spec = require(pkgName + '/spec');
      if (_.isFunction(spec.afterExecute)) {
        spec.afterExecute(options);
      }
    });
  });
};
