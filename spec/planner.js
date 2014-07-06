var lib = require('xtuple-server-lib'),
  assert = require('assert'),
  _ = require('lodash'),
  planner = require('../');

function getPackageName (phaseName, taskName) {
  return 'xtuple-server-' + phaseName + '-' + taskName;
}

exports.describe = function (parent) {
  var options = JSON.parse(JSON.stringify(parent.options));
  var planObject = JSON.parse(JSON.stringify(parent.planObject));
  var plan = planObject.plan;

  describe(planObject.description, function () {

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
        var phaseOptions = phase.options || { };

        describe(pkgName, function () {
          if (phaseOptions.execute === false) return;

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
        var pkgName = getPackageName(phase.name, taskName);
        var spec = require(pkgName + '/spec');

        it(pkgName + '#afterInstall', function () {
          task.afterInstall(options);
          if (_.isFunction(spec.afterExecute)) {
            spec.afterExecute(options);
          }
        });
      });
    });
  });
};
