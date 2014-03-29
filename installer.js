(function () {
  'use strict';

  /**
   * Installer
   * TODO yea, this whole process should be driven by events. each module binds
   * to the 'run' event or something in the plan order, and once all preprocessing
   * is done we just fire that event once and the big wheel starts turning.
   * Another day
   */
  var installer = exports;

  var fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    os = require('os'),
    prompt = require('prompt'),
    Commander = require('installer'),
    clc = require('cli-color'),
    S = require('string'),
    _ = require('underscore'),
    install = Commander.version('1.8.0').command('install'),
    options = { },
    logo_orange = fs.readFileSync(path.resolve(__dirname, './x-orange.ascii'), 'ascii').trim(),
    logo_blue = fs.readFileSync(path.resolve(__dirname, './x-blue.ascii'), 'ascii').trim(),
    logo_mono = fs.readFileSync(path.resolve(__dirname, './x.ascii'), 'ascii').trim(),
    logo_lines= _.map(
      _.object(logo_orange.split('\n'), logo_blue.split('\n')),
      function (blue_line, orange_line) {
        return orange_line + blue_line;
      }
    ),
    format_prefix = function(step, task) {
      return '{step}.{task}'.format({
        step: step.name,
        task: task
      });
    },
    plan = require(path.resolve(__dirname, 'plan')),
    current = 1;

  _.extend(installer, /** @exports installer */ {

    logfile: path.resolve('install.log'),

    /**
     * Advance progress bar 
     * @protected
     */
    log_progress: function (state) {
      console.log(clc.reset);
      _.each(_.range(current), function (i) {
        console.log(logo_lines[i]);
      });

      _.each(_.tail(logo_lines, current), function (i) {
        console.log();
      });

      console.log();
      installer.log({
        prefix: '{step}.{task}'.format(state),
        msg: state.msg || 'Installing... '
      }, true);

      if (/xt/.test(state.step)) {
        current += 2;
      }
      else {
        current++;
      }
    },

    /**
     * Log TODO use standard logging lib
     */
    log: function (payload, stdout) {
      var output = '[{prefix}] {msg}'.format({
        prefix: payload.prefix || 'xtuple',
        msg: _.isObject(payload.msg) ? JSON.stringify(payload.msg, null, 2) : payload.msg
      });
      fs.appendFileSync(installer.logfile, output + os.EOL);
      if (stdout) {
        console.log(output);
      }
    },

    /**
     * Log an error and kill the process
     */
    die: function (payload) {
      console.log(clc.reset);
      installer.log({ msg: clc.red.bold(payload.msg), prefix: payload.prefix }, true);
      console.log();
      process.exit(1);
    },

    run: function (options) {

      var plan = options.sys.plan,
        stepdata = options;

      _.each(plan, function (step) {
        var stepmodule = require(path.resolve('./lib/', step)),
          taskdata = { };
          
        stepdata[step.name] = _.extend(taskdata, options[step.name]);

        _.each(step.tasks, function (task) {
          var taskmodule = stepmodule[task];

          try {
            installer.log_progress({ step: step.name, task: task });
            taskdata[task] = _.extend({ }, taskmodule.run(stepdata));
          }
          catch (e) {
            installer.log({ msg: e.stack, prefix: format_prefix(step, task) });
            installer.log({ msg: 'See log for error details.', prefix: format_prefix(step, task) }, true);
            installer.die({ msg: e.message, prefix: format_prefix(step, task) });
          }
        }, { });
      }, { });
    }
  });

  fs.writeFileSync(installer.logfile, os.EOL);
  
  // compile Commander's options list. I wish it accepted a json object; instead
  // we must populate it via api calls
  _.each(plan, function (step) {
    _.each(step.tasks, function (task) {
      try {
        var module_path = path.resolve(__dirname, '..', step.name, task),
          taskmodule = require(module_path),
          options = _.defaults({ }, taskmodule.options);
        _.each(options, function (option_details, option_name) {
          var flag = '--{module}-{option} {optional}{required}'.format(_.extend({
            option: option_name,
            module: step.name,
          }, option_details));

          install.option(flag, option_details.description);

          // set default argument value
          (options[step.name] || (options[step.name] = { }));
          options[step.name][option_name] = option_details.value;
        });
      }
      catch (e) {
        installer.log({ msg: e.stack, prefix: format_prefix(step, task) });
        installer.log({ msg: 'See log for error details.', prefix: format_prefix(step, task) }, true);
        installer.die({ msg: e.message, prefix: format_prefix(step, task) });
      }
    });
  });

  install.parse(process.argv);
  install.usage(
    _.reduce(_.where(install.options, { optional: 0 }), function (memo, option) {
      return memo + ' ' + option.flags;
    }, ''));

  // now that installer has parsed the arguments, go back through and override
  // default values with provided values. installer's automatic camelcasing of
  // arguments, as well as its strange setting of values directly on the
  // 'Commander' object unfortunately complicate this process somewhat.
  _.each(install.options, function (option) {
    var flag = option.long,
      cleanflag = option.long.replace('--', ''),
      prop = S(cleanflag).camelize().s,
      argpath = cleanflag.split('-');

    if (!_.isUndefined(install[prop])) {
      options[argpath[0]][argpath[1]] = install[prop];
    }
  });

  // verify required options
  _.each(plan, function (step) {
    _.each(step.tasks, function (task) {
      var taskmodule = require(path.resolve(__dirname, '..', step.name, task));

      _.each(taskmodule.options, function (option, key) {
        if (_.isString(option.required) && _.isUndefined(options[step.name][key])) {
          installer.log({ msg: 'Missing required argument: ' + key }, true);
          installer.die({ msg: JSON.stringify(option, null, 2) });
        }
      });
    });
  });

  _.each(plan, function (step) {
    installer.log({ msg: 'Module: {name}'.format(step) }, true);
    installer.log({ msg: '  Tasks: ' + JSON.stringify(step.tasks) }, true);
    installer.log({ msg: '  Arguments: '+ JSON.stringify(options[step.name], null, 2) }, true);
  });
  installer.log({ msg: 'Confirm that the above Installation Plan is Correct'}, true);

  prompt.get('Press Enter to Continue', function(err, result) {
    process.emit('optionsParse', options);
    installer.run(_.extend(options, {
      logfile: installer.logfile,
      sys: { plan: plan }
    }), true);
    current = logo_lines.length;
    installer.log_progress({ step: 'installer', task: 'installer', msg: 'Done!'});
    process.exit(0);
  });
})();
