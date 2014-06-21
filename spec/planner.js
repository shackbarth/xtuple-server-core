var assert = require('chai').assert,
  _ = require('lodash'),
  planner = require('../');

function getPackageName (phaseName, taskName) {
  return 'xtuple-server-' + phaseName + '-' + taskName;
}

exports.describe = function (parent) {
  var options = _.clone(parent.options);
  var planObject = _.clone(parent.planObject);
  var plan = planObject.plan;

  it.skip(planObject.description);

  before(function () {
    planner.compileOptions(plan, options);
    planner.verifyOptions(plan, options);
  });

  describe('before execute', function () {

    planner.eachTask(plan, function (task, phase, taskName) {
      it('#beforeInstall <- '+ getPackageName(phase.name, taskName), function () {
        task.beforeInstall(options);
      });
    });

    planner.eachTask(plan, function (task, phase, taskName) {
      var pkgName = getPackageName(phase.name, taskName);
      var spec = require(pkgName + '/spec');
      if (_.isFunction(spec.beforeExecute)) {
        describe(pkgName, function () {
          spec.beforeExecute(JSON.parse(JSON.stringify(options)));
        });
      }
    });
  });

  describe('execute', function () {
    
    if (/^uninstall/.test(options.planName)) {
      it('#uninstall', function () {
        planner.uninstall(options);
      });

      return;
    }

    planner.eachTask(plan, function (task, phase, taskName) {
      var pkgName = getPackageName(phase.name, taskName);
      var spec = require(pkgName + '/spec');

      describe(pkgName, function () {

        it('#beforeTask, #executeTask, #afterTask', function () {
          task.beforeTask(options);
          task.executeTask(options);
          task.afterTask(options);
        });

        if (_.isFunction(spec.afterTask)) {
          describe(pkgName, function () {
            spec.afterTask((JSON.parse(JSON.stringify(options)));
          });
        }
      });
    });
  });

  describe('after execute', function () {

    if (/^uninstall/.test(options.planName)) {
      return;
    }

    planner.eachTask(plan, function (task, phase, taskName) {
      it('#afterInstall <- '+ getPackageName(phase.name, taskName), function () {
        task.afterInstall(options);
      });
    });

    planner.eachTask(plan, function (task, phase, taskName) {
      var pkgName = getPackageName(phase.name, taskName);
      var spec = require(pkgName + '/spec');
      if (_.isFunction(spec.afterExecute) && /^install/.test(options.planName)) {
        describe(pkgName, function () {
          spec.afterExecute((JSON.parse(JSON.stringify(options)));
        });
      }
    });
  });
};
