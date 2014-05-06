(function () {
  'use strict';

  var planner = exports;

  var Q = require('q'),
    fs = require('fs'),
    util = require('util'),
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
      planner.rollback(options);
      process.exit(1);
    },

    /**
     * Invoke a function on each task
     * @callback func (task, phaseName, taskName);
     */
    eachTask: function (plan, func, options) {
      _.each(plan, function (phase) {
        var phaseName = phase.name;
        _.each(phase.tasks, function (taskName) {
          try {
            if (!tasks[phaseName]) {
              tasks[phaseName] = require('../tasks/' + phaseName);
            }
            return func(tasks[phaseName][taskName], phaseName, taskName);
          }
          catch (e) {
            planner.log({ msg: util.inspect(e), prefix: planner.format_prefix(phaseName, taskName) });
            planner.log({ msg: 'See log for error details.', prefix: planner.format_prefix(phaseName, taskName) }, true);
            planner.die({ msg: e.message, prefix: planner.format_prefix(phaseName, taskName) }, options);
          }
        });
      });
    },

    displayPlan: function (plan, options) {
      return _.map(_.groupBy(plan, 'name'), function (nestedPhase, name) {
        var tasks = _.flatten(_.pluck(nestedPhase, 'tasks'));
        return {
          phase: name,
          tasks: JSON.stringify(tasks),
          inputs: JSON.stringify(options[name])
        };
      });
    },

    verifyOptions: function (plan, options) {
      // verify required options
      planner.eachTask(plan, function (task, phaseName, taskName) {
        var invalidOptions = _.filter(task.options, function (option, key) {
          return _.any([
            _.isString(option.required) && _.isUndefined(options[phaseName][key]),
            _.isFunction(option.validate) && !option.validate(options[phaseName][key])
          ]);
        });

        if (invalidOptions.length > 0) {
          planner.die({
            msg: "Arguments are missing or failed validation: \n"+ JSON.stringify(invalidOptions, null, 2)
          }, options);
        }
      });
    },

    /**
     * Compile a pure, non-commander based options object.
     */
    compileOptions: function (plan, options) {
      planner.eachTask(plan, function (task, phaseName, taskName) {

        options[phaseName] || (options[phaseName] = { });
        options[phaseName][taskName] || (options[phaseName][taskName] = { });

        _.each(task.options, function (option, optionName) {
          if (_.isUndefined(options[phaseName][optionName])) {
            options[phaseName][optionName] = option.value;
          }
          if (options[phaseName][optionName] === true) {
            /**
             * If something is true, I delete it? Yes, this looks odd, which is
             * why this comment is here. It is very difficult in webmin to
             * completely eradicate flags; the best we can do is have their
             * values be blank. This results in 'commander' setting the values
             * to true. Now the design is such that no flags are allowed to be
             * argument-less. Booleans are set to either 'yes' or 'no'. This
             * will be made clear in the READMEa
             *
             */
            delete options[phaseName][optionName];
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

    /**
     * Run planner with the specified plan and options. Atomic.
     * @returns promise
     */
    execute: _.partial(Q.fcall, function (plan, options) {
      var originalOptions = JSON.stringify(options, null, 2);
      options.progress = [ ];
      options.plan = plan;

      // beforeInstall
      planner.log({ prefix: 'installer', msg: 'Pre-flight checks...' });
      planner.eachTask(plan, function (task, phaseName, taskName) {
        task.beforeInstall(options);
      }, options);

      // install plan tasks
      planner.eachTask(plan, function (task, phaseName, taskName) {
        options.progress.push({ phase: phaseName, task: taskName });
        task.beforeTask(options);

        options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'Running...' });
        task.doTask(options);

        task.afterTask(options);
      }, options);

      // afterInstall
      planner.eachTask(plan, function (task, phaseName, taskName) {
        options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'Finishing...' });
        task.afterInstall(options);
      }, options);

      // log tons of info about the installation that we might want to look at
      // later
      options.xt && options.xt.configdir && fs.writeFileSync(
        path.resolve(options.xt.configdir, 'install-arguments.json'),
        originalOptions
      );
      options.xt && options.xt.configdir && fs.writeFileSync(
        path.resolve(options.xt.configdir, 'install-results.json'),
        util.inspect(options)
      );

      return true;
    })
  });

})();


