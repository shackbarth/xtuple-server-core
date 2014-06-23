var Q = require('q'),
  fs = require('fs'),
  path = require('path'),
  format = require('string-format'),
  semver = require('semver'),
  os = require('os'),
  _ = require('lodash');

_.extend(exports, /** @exports planner */ {

  logfile: path.resolve('install.log'),

  requireTask: function (phaseName, taskName) {
    return require('xtuple-server-' + phaseName + '-' + taskName);
  },

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
          return func(exports.requireTask(phase.name, taskName), phase, taskName);
        }
        catch (e) {
          exports.log({ msg: e.stack.split('\n'), prefix: exports.format_prefix(phase.name, taskName) }, false);
          exports.die({ msg: e.message, prefix: exports.format_prefix(phase.name, taskName) }, options);
        }
      });
    });
  },

  verifyOptions: function (plan, options) {
    if (_.isEmpty(options.type)) {
      throw new TypeError('<type> is a required field');
    }
    exports.eachTask(plan, function (task, phase, taskName) {
      _.each(task, options, function (option, key) {
        if (_.isFunction(option.validate) && phase.options.validate !== false) {
          // this will throw an exception if invalid
          options[phase.name][key] = option.validate(options[phase.name][key], options);
        }
      });
    });
  },

  /**
    * Compile a pure, non-commander based options object.
    */
  compileOptions: function (plan, options) {

    options.n = { version: semver.clean(process.env.NODE_VERSION || process.version) };
    options.n.npm = 'n '+ options.n.version + ' && npm';
    options.n.use = 'n use '+ options.n.version;
    options.n.bin = 'n bin '+ options.n.version;

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

  uninstall: function (options) {
    _.each(options.plan.reverse(), function (phase) {
      var phaseName = phase.name;
      _.each(phase.tasks, function (taskName) {
        var task = exports.requireTask(phaseName, taskName);
        task.uninstall(options);
      });
    });
  },

  /**
   * Run planner with the specified plan and options. Atomic.
   * @returns promise
   */
  execute: function (plan, options) {
    var deferred = Q.defer(),
      originalOptions = JSON.stringify(options, null, 2);

    setTimeout(function () {
      options.plan = plan;

      if (!_.isString(options.planName)) {
        deferred.reject(new Error('planName is required'));
      }

      // beforeInstall
      exports.log({ prefix: 'installer', msg: 'Pre-flight checks...' });
      exports.eachTask(plan, function (task, phase, taskName) {
        task.beforeInstall(options);
      }, options);

      if (/^uninstall/.test(options.planName)) {
        exports.uninstall(options);
        deferred.resolve();
        return deferred.promise;
      }

      // execute plan tasks
      exports.eachTask(plan, function (task, phase, taskName) {
        var phaseOptions = phase.options || { };

        if (phaseOptions.execute !== false) {
          exports.log_progress({ phase: phase.name, task: taskName, msg: 'Running...' });
          task.beforeTask(options);
          task.executeTask(options);
          task.afterTask(options);
        }

      }, options);

      exports.eachTask(plan, function (task, phase, taskName) {
        exports.log_progress({ phase: phase.name, task: taskName, msg: 'Finishing...' });
        task.afterInstall(options);
      }, options);

      deferred.resolve();
    }, 100);

    return deferred.promise;
  }
});
