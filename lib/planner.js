(function () {
  'use strict';

  var Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    os = require('os'),
    exec = require('execSync').exec,
    _ = require('lodash'),
    tasks = { };

  _.extend(exports, /** @exports planner */ {

    logfile: path.resolve('install.log'),

    /** @protected */
    log_progress: function (state) {
      exports.log({ prefix: '{phase}.{task}'.format(state), msg: state.msg, }, true);
    },

    format_prefix: function(phaseName, taskName) {
      return phaseName + '.' + taskName;
    },

    /**
     * Log TODO use standard logging lib
     */
    log: function (payload, stdout) {
      var output = '[{prefix}] {msg}'.format({
        prefix: payload.prefix || 'xtuple',
        msg: _.isObject(payload.msg) ? JSON.stringify(payload.msg, null, 2) : payload.msg
      });
      fs.appendFileSync(exports.logfile, output + os.EOL);
      if (stdout) {
        console.log(output);
      }
    },

    /**
     * Log an error and kill the process
     */
    die: function (payload, options) {
      exports.log({ msg: payload.msg, prefix: payload.prefix }, true);
      if (_.isObject(options) && _.isArray(options.progress)) {
        exports.rollback(options);
      }
      console.log('Encountered Error. Stopping. See log for details.');
      process.exit(1);
    },

    /**
     * Invoke a function on each task
     * @callback func (task, phase, taskName);
     */
    eachTask: function (plan, func, options) {
      _.each(plan, function (phase) {
        _.each(phase.tasks, function (taskName) {
          try {
            if (!tasks[phase.name]) {
              tasks[phase.name] = require('../tasks/' + phase.name);
            }
            return func(tasks[phase.name][taskName], phase, taskName);
          }
          catch (e) {
            exports.log({ msg: e.stack.split('\n'), prefix: exports.format_prefix(phase.name, taskName) }, false);
            exports.die({ msg: e.message, prefix: exports.format_prefix(phase.name, taskName) }, options);
          }
        });
      });
    },

    verifyOptions: function (plan, options) {
      // verify required options
      exports.eachTask(plan, function (task, phase, taskName) {
        var invalidOptions = _.filter(task.options, function (option, key) {
          return _.any([
            _.isString(option.required) && _.isUndefined(options[phase.name][key]),
            _.isFunction(option.validate) && !option.validate(options[phase.name][key])
          ]);
        });

        if (invalidOptions.length > 0) {
          exports.die({
            msg: "Arguments are missing or failed validation: \n"+ JSON.stringify(invalidOptions, null, 2)
          });
        }
      });
    },

    /**
     * Compile a pure, non-commander based options object.
     */
    compileOptions: function (plan, options) {
      exports.eachTask(plan, function (task, phase, taskName) {
        options[phase.name] || (options[phase.name] = { });
        options[phase.name][taskName] || (options[phase.name][taskName] = { });

        // load in default options specified in planfile
        if (_.isObject(phase.options)) {
          _.defaults(options[phase.name], phase.options);
        }

        // load in default options specified in task modules
        _.each(task.options, function (option, optionName) {
          if (_.isUndefined(options[phase.name][optionName])) {
            options[phase.name][optionName] = option.value;
          }
        });
      });
    },

    /**
     * Rollback a failed installation; call 'uninstall' on every task that has
     * been run so far. State is maintained in options.progress
     */
    rollback: function (options) {
      exports.log({ prefix: 'installer', msg: 'Rolling Back Changes...' }, true);
      _.each(options.progress.reverse(), function (state) {
        try {
          exports.log({ prefix: '{phase}.{task}'.format(state), msg: 'Uninstalling...' }, true);
          tasks[state.phase][state.task].uninstall(options);
        }
        catch (e) {
          // console.log(e);
        }
      });
      console.log('Done.');
    },

    uninstall: function (options) {
      exports.eachTask(options.plan, function (task, phase, taskName) {
        options.progress.push({ phase: phase.name, task: taskName });
      });
      exports.rollback(options);
    },
    /**
     * Run planner with the specified plan and options. Atomic.
     * @returns promise
     */
    execute: function (plan, options) {
      var deferred = Q.defer(),
        originalOptions = JSON.stringify(options, null, 2);

      setTimeout(function () {
        options.progress = [ ];
        options.plan = plan;

        if (!_.isString(options.planName)) {
          deferred.reject(new Error('planName is required'));
        }

        if (options.planName === 'uninstall') {
          exports.uninstall(options);
          return deferred.resolve();
        }

        // beforeInstall
        exports.log({ prefix: 'installer', msg: 'Pre-flight checks...' });
        exports.eachTask(plan, function (task, phase, taskName) {
          var phaseOptions = phase.options || { };
          if (phaseOptions.validate !== false) {
            task.beforeInstall(options);
          }
        }, options);

        // execute plan tasks
        exports.eachTask(plan, function (task, phase, taskName) {
          var phaseOptions = phase.options || { };

          if (phaseOptions.execute !== false) {
            exports.log_progress({ phase: phase.name, task: taskName, msg: 'Running...' });
            options.progress.push({ phase: phase.name, task: taskName });
            task.beforeTask(options);
            task.executeTask(options);
            task.afterTask(options);
          }

        }, options);

        // afterInstall
        exports.eachTask(plan, function (task, phase, taskName) {
          exports.log_progress({ phase: phase.name, task: taskName, msg: 'Finishing...' });
          task.afterInstall(options);
        }, options);

        deferred.resolve();
      }, 100);

      return deferred.promise;
    }
  });

})();
