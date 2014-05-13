(function () {
  'use strict';

  var planner = exports;

  var Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    pgcli = require('./pg-cli'),
    format = require('string-format'),
    os = require('os'),
    exec = require('execSync').exec,
    _ = require('lodash'),
    logo_orange = fs.readFileSync(path.resolve(__dirname, './x-orange.ascii'), 'ascii').trim(),
    logo_blue = fs.readFileSync(path.resolve(__dirname, './x-blue.ascii'), 'ascii').trim(),
    logo_mono = fs.readFileSync(path.resolve(__dirname, './x.ascii'), 'ascii').trim(),
    logo_lines= _.map(
      _.object(logo_orange.split('\n'), logo_blue.split('\n')),
      function (blue_line, orange_line) {
        return orange_line + blue_line;
      }
    ),
    tasks = { },
    current = 1;

  _.extend(planner, /** @exports planner */ {

    logfile: path.resolve('install.log'),

    /**
     * Advance progress bar 
     * @protected
     */
    log_progress: function (state) {
      planner.log({ prefix: '{phase}.{task}'.format(state), msg: state.msg, }, true);
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
      fs.appendFileSync(planner.logfile, output + os.EOL);
      if (stdout) {
        console.log(output);
      }
    },

    /**
     * Log an error and kill the process
     */
    die: function (payload, options) {
      planner.log({ msg: payload.msg, prefix: payload.prefix }, true);
      console.log();
      if (_.isObject(options) && _.isArray(options.progress)) {
        planner.rollback(options);
      }
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
            planner.log({ msg: 'See log for error details.', prefix: planner.format_prefix(phase.name, taskName) }, true);
            planner.die({ msg: e.stack.split('\n'), prefix: planner.format_prefix(phase.name, taskName) }, options);
          }
        });
      });
    },

    verifyOptions: function (plan, options) {
      // verify required options
      planner.eachTask(plan, function (task, phase, taskName) {
        var invalidOptions = _.filter(task.options, function (option, key) {
          return _.any([
            _.isString(option.required) && _.isUndefined(options[phase.name][key]),
            _.isFunction(option.validate) && !option.validate(options[phase.name][key])
          ]);
        });

        if (invalidOptions.length > 0) {
          planner.die({
            msg: "Arguments are missing or failed validation: \n"+ JSON.stringify(invalidOptions, null, 2)
          });
        }
      });
    },

    /**
     * Compile a pure, non-commander based options object.
     */
    compileOptions: function (plan, options) {
      planner.eachTask(plan, function (task, phase, taskName) {
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
      planner.log({ prefix: 'installer', msg: 'Rolling Back Changes...' }, true);
      _.each(options.progress.reverse(), function (state) {
        try {
          planner.log({ prefix: '{phase}.{task}'.format(state), msg: 'Uninstalling...' }, true);
          tasks[state.phase][state.task].uninstall(options);
        }
        catch (e) {
          // console.log(e);
        }
      });
      console.log('Done.');
    },

    uninstall: function (options) {
      planner.eachTask(options.plan, function (task, phase, taskName) {
        options.progress.push({ phase: phase.name, task: taskName });
      });
      planner.rollback(options);
    },
    /**
     * Run planner with the specified plan and options. Atomic.
     * @returns promise
     */
    execute: _.partial(Q.fcall, function (plan, options) {
      var originalOptions = JSON.stringify(options, null, 2);
      options.progress = [ ];
      options.plan = plan;

      if (options.planName === 'uninstall') {
        return planner.uninstall(options);
      }

      // beforeInstall
      planner.log({ prefix: 'installer', msg: 'Pre-flight checks...' });
      planner.eachTask(plan, function (task, phase, taskName) {
        task.beforeInstall(options);
      }, options);

      // execute plan tasks
      planner.eachTask(plan, function (task, phase, taskName) {
        if (options[phase.name].execute === false) {
          return;
        }

        options.progress.push({ phase: phase.name, task: taskName });
        task.beforeTask(options);

        options.quiet || planner.log_progress({ phase: phase.name, task: taskName, msg: 'Running...' });
        task.executeTask(options);

        task.afterTask(options);
      }, options);

      // afterInstall
      planner.eachTask(plan, function (task, phase, taskName) {
        options.quiet || planner.log_progress({ phase: phase.name, task: taskName, msg: 'Finishing...' });
        task.afterInstall(options);
      }, options);

      return true;
    })
  });

})();
