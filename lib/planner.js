(function () {
  'use strict';

  var planner = exports;

  var fs = require('fs'),
    path = require('path'),
    pgcli = require('./pg-cli'),
    format = require('string-format'),
    os = require('os'),
    clc = require('cli-color'),
    exec = require('execSync').exec,
    _ = require('underscore'),
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
      //console.log(clc.reset);
      /*
      _.each(_.range(current), function (i) {
        console.log(logo_lines[i]);
      });

      _.each(_.tail(logo_lines, current), function (i) {
        console.log();
      });
      */

      //console.log();
      planner.log({
        prefix: '{phase}.{task}'.format(state),
        msg: state.msg || 'Installing... '
      }, true);

      if (/xt/.test(state.phase)) {
        current += 2;
      }
      else {
        current++;
      }
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
    die: function (payload) {
      //console.log(clc.reset);
      planner.log({ msg: clc.red.bold(payload.msg), prefix: payload.prefix }, true);
      console.log();
      process.exit(1);
    },

    /**
     * Invoke a function on each task
     * @callback func (task, phaseName, taskName);
     */
    eachTask: function (plan, func) {
      _.map(plan, function (phase) {
        var phaseName = phase.name;
        _.map(phase.tasks, function (taskName) {
          try {
            if (!tasks[phaseName]) {
              tasks[phaseName] = require('../tasks/' + phaseName);
            }
            return func(tasks[phaseName][taskName], phaseName, taskName);
          }
          catch (e) {
            planner.log({ msg: e.stack, prefix: planner.format_prefix(phaseName, taskName) });
            planner.log({ msg: 'See log for error details.', prefix: planner.format_prefix(phaseName, taskName) }, true);
            planner.die({ msg: e.message, prefix: planner.format_prefix(phaseName, taskName) });
          }
        });
      });
    },

    displayPlan: function (plan, options) {
      _.each(plan, function (phase) {
        planner.log({ msg: 'Module: {name}'.format(phase) }, true);
        planner.log({ msg: '  Tasks: ' + JSON.stringify(phase.tasks) }, true);
        planner.log({ msg: '  Arguments: '+ JSON.stringify(options[phase.name], function (key, value) {
          if (_.isObject(value) && _.isEmpty(value)) { return undefined; }
          if (value === null) { return undefined; }

          return value;
        }) }, true);
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
          });
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
        });
      });
    },

    /**
     * Run planner with the specified plan and options.
     */
    install: function (plan, options) {
      // no-op; we might want these later
      var originalOptions = JSON.stringify(options, null, 2);

      // beforeInstall
      if (options.force === true) {
        planner.eachTask(plan, function (task, phaseName, taskName) {
          options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'Uninstalling (--force)...' });
          task.uninstall(options);
        });
      }

      // beforeInstall
      planner.eachTask(plan, function (task, phaseName, taskName) {
        options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'Preparing...' });
        task.beforeInstall(options);
      });

      // install plan tasks
      planner.eachTask(plan, function (task, phaseName, taskName) {
        //options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'Before Task...' });
        task.beforeTask(options);

        options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'Installing...' });
        task.doTask(options);

        //options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'After Task...' });
        task.afterTask(options);
      });

      // afterInstall
      planner.eachTask(plan, function (task, phaseName, taskName) {
        options.quiet || planner.log_progress({ phase: phaseName, task: taskName, msg: 'Wrapping up...' });
        task.afterInstall(options);
      });

      // log tons of info about the installation that we might want to look at
      // later
      fs.writeFileSync(
        path.resolve(options.xt.configdir, 'install-arguments.json'),
        originalOptions
      );
      /*
       * XXX circular JSON
      fs.writeFileSync(
        path.resolve(options.xt.configdir, 'install-results.json'),
        JSON.stringify(options, null, 2)
      );
      */
    }
  });

})();


