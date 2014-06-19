var assert = require('chai').assert,
  exec = require('execSync').exec,
  _ = require('lodash'),
  lib = require('xtuple-server-lib'),
  path = require('path'),
  fs = require('fs'),
  Mocha = require('mocha'),
  planner = lib.planner;

function getPackageName (phaseName, taskName) {
  return 'xtuple-server-' + phaseName + '-' + taskName;
}
function getPackageSpecPath (packageName) {
  return path.resolve(path.dirname(require.resolve(packageName)), 'spec');
}

exports.describe = function (parent) {
  var options = _.clone(parent.options);
  var suite = this;
  var planModule = require('xtuple-server/plans')[options.planName];
  var plan = planModule.plan;
  _.isArray(options.plan) || (options.plan = plan);

  it.skip(planModule.description);

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
          spec.beforeExecute(options);
        });
      }
    });
  });

  describe('execute', function () {
    var suite = this;
    
    if (/^uninstall/.test(options.planName)) {
      it('#uninstall', function () {
        lib.planner.uninstall(options);
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
            spec.afterTask(options);
          });
        }
      });
    });
  });

  describe('after execute', function () {
    var suite = this;

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
          spec.afterExecute(options);
        });
      }
    });
  });
};
