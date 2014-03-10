(function () {
  'use strict';

  var fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    os = require('os'),
    prompt = require('prompt'),
    Commander = require('commander'),
    clc = require('cli-color'),
    S = require('string'),
    _ = require('underscore'),
    usage = '',
    command = Commander.version('1.8.0').command('install'),
    runargs = { };

  var wd = __dirname,
    installer_dir = path.resolve(wd, '../../'),
    logo_orange = fs.readFileSync(path.resolve(wd, './x-orange.ascii'), 'ascii').trim(),
    logo_blue = fs.readFileSync(path.resolve(wd, './x-blue.ascii'), 'ascii').trim(),
    logo_mono = fs.readFileSync(path.resolve(wd, './x.ascii'), 'ascii').trim(),
    logo_lines_grey = _.map(logo_mono.split('\n'), function (line) {
      var grey = clc.xterm(238);
      return grey(line);
    }),
    logo_lines_colored = _.map(
      _.object(logo_orange.split('\n'), logo_blue.split('\n')),
      function (blue_line, orange_line) {
        var orange = clc.xterm(202), blue = clc.xterm(39);
        return orange(orange_line) + blue(blue_line);
      }
    ),
    format_prefix = function(step, task) {
      return '{step}.{task}'.format({
        step: step.name,
        task: task
      });
    },
    plan = require(path.resolve(wd, 'plan')),
    current = 0;

  var installer = exports;

  _.extend(installer, /** @exports installer */ {

    logfile: path.resolve('install.log'),

    log_progress: function (state) {
      //console.log(clc.reset);
      _.each(_.range(current), function (i) {
        console.log(logo_lines_colored[i]);
      });
      _.each(_.range(current, logo_lines_grey.length), function (i) {
        console.log(logo_lines_grey[i]);
      });

      console.log();
      installer.log({ prefix: '{step}.{task}'.format(state), msg: state.msg || 'Installing... '  }, true);
      if (/xt/.test(state.step)) {
        current += 3;
      }
      else {
        current++;
      }
    },

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

    die: function (payload) {
      //console.log(clc.reset);
      installer.log({ msg: clc.red.bold(payload.msg), prefix: payload.prefix }, true);
      console.log();
      process.exit(1);
    },

    run: function (options) {

      var plan = options.sys.plan,
        stepdata = options;

      _.each(plan, function (step) {
        var taskdata = { };
        stepdata[step.name] = _.extend(taskdata, options[step.name]);

        _.each(step.tasks, function (task) {
          var taskmodule = require(path.resolve(wd, '..', step.name, task));

          try {
            //console.log(stepdata);
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
        var module_path = path.resolve(wd, '..', step.name, task),
          taskmodule = require(module_path),
          options = _.defaults({ }, taskmodule.options);
        _.each(options, function (option_details, option_name) {
          var flag = '--{module}-{option} {optional}{required}'.format(_.extend({
            option: option_name,
            module: step.name,
          }, option_details));

          command.option(flag, option_details.description);

          // set default argument value
          (runargs[step.name] || (runargs[step.name] = { }));
          runargs[step.name][option_name] = option_details.value;
        });
      }
      catch (e) {
        installer.log({ msg: e.stack, prefix: format_prefix(step, task) });
        installer.log({ msg: 'See log for error details.', prefix: format_prefix(step, task) }, true);
        installer.die({ msg: e.message, prefix: format_prefix(step, task) });
      }
    });
  });

  command.parse(process.argv);
  command.usage(
    _.reduce(_.where(command.options, { optional: 0 }), function (memo, option) {
      return memo + ' ' + option.flags;
    }, ''));

  // now that commander has parsed the arguments, go back through and override
  // default values with provided values. commander's automatic camelcasing of
  // arguments, as well as its strange setting of values directly on the
  // 'Commander' object unfortunately complicate this process somewhat.
  _.each(command.options, function (option) {
    var flag = option.long,
      cleanflag = option.long.replace('--', ''),
      prop = S(cleanflag).camelize().s,
      argpath = cleanflag.split('-');

    if (!_.isUndefined(command[prop])) {
      runargs[argpath[0]][argpath[1]] = command[prop];
    }
  });

  // make sure we aren't missing any required arguments
  _.each(plan, function (step) {
    _.each(step.tasks, function (task) {
      var taskmodule = require(path.resolve(wd, '..', step.name, task));

      _.each(taskmodule.options, function (option, key) {
        if (_.isString(option.required) && _.isUndefined(runargs[step.name][key])) {
          installer.log({ msg: 'Missing required argument: ' + key }, true);
          installer.die({ msg: JSON.stringify(option, null, 2) });
        }
      });
    });
  });

  _.each(_.tail(plan), function (step) {
    installer.log({ msg: 'Module: {name}'.format(step) }, true);
    installer.log({ msg: '  Tasks: ' + JSON.stringify(step.tasks) }, true);
    installer.log({ msg: '  Arguments: '+ JSON.stringify(runargs[step.name], null, 2) }, true);
  });
  installer.log({ msg: 'Confirm that the above Installation Plan is Correct'}, true);

  prompt.get('Press Enter to Continue', function(err, result) {
    installer.run(_.extend(runargs, {
      logfile: installer.logfile,
      sys: { plan: _.tail(plan) }
    }), true);
    current = logo_lines_colored.length;
    installer.log_progress({ step: 'sys', task: 'installer', msg: 'Done!'});
    process.exit(0);
  });
})();
