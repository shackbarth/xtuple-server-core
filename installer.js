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
    pgcli = require('./lib/pg-cli'),
    format = require('string-format'),
    os = require('os'),
    exec = require('execSync').exec,
    prompt = require('prompt'),
    Commander = require('commander'),
    clc = require('cli-color'),
    S = require('string'),
    _ = require('underscore'),
    install = Commander.version('1.8.0').command('install'),
    options = { },
    logo_orange = fs.readFileSync(path.resolve(__dirname, './lib/x-orange.ascii'), 'ascii').trim(),
    logo_blue = fs.readFileSync(path.resolve(__dirname, './lib/x-blue.ascii'), 'ascii').trim(),
    logo_mono = fs.readFileSync(path.resolve(__dirname, './lib/x.ascii'), 'ascii').trim(),
    logo_lines= _.map(
      _.object(logo_orange.split('\n'), logo_blue.split('\n')),
      function (blue_line, orange_line) {
        return orange_line + blue_line;
      }
    ),
    format_prefix = function(phaseName, taskName) {
      return phaseName + '.' + taskName;
    },
    plan = require('./plan'),
    tasks = { },
    current = 1;

  _.extend(installer, /** @exports installer */ {

    logfile: path.resolve('install.log'),

    /**
     * Advance progress bar 
     * @protected
     */
    log_progress: function (state) {
      //console.log(clc.reset);
      _.each(_.range(current), function (i) {
        console.log(logo_lines[i]);
      });

      _.each(_.tail(logo_lines, current), function (i) {
        console.log();
      });

      console.log();
      installer.log({
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
      //console.log(clc.reset);
      installer.log({ msg: clc.red.bold(payload.msg), prefix: payload.prefix }, true);
      console.log();
      process.exit(1);
    },

    /**
     * Invoke a function on each task
     * @callback (task, phaseName, taskName);
     */
    eachTask: function (func) {
      _.map(plan, function (phase) {
        var phaseName = phase.name;
        _.map(phase.tasks, function (taskName) {
          try {
            if (!tasks[phaseName]) {
              tasks[phaseName] = require('./tasks/' + phaseName);
            }
            return func(tasks[phaseName][taskName], phaseName, taskName);
          }
          catch (e) {
            installer.log({ msg: e.stack, prefix: format_prefix(phaseName, taskName) });
            installer.log({ msg: 'See log for error details.', prefix: format_prefix(phaseName, taskName) }, true);
            installer.die({ msg: e.message, prefix: format_prefix(phaseName, taskName) });
          }
        });
      });
    }
  });

  // self-tests
  if (exec('id -u').stdout.indexOf('0') !== 0) {
    installer.die({ msg: 'Installer must be run as root', prefix: 'xtuple' });
  }

  fs.writeFileSync(installer.logfile, os.EOL);

  // compile Commander's options list. I wish it accepted a json object; instead
  // we must populate it via api calls
  installer.eachTask(function (task, phaseName, taskName) {
    options[phaseName] || (options[phaseName] = { });
    options[phaseName][taskName] = { };

    _.each(task.options, function (option_details, option_name) {
      try {
        var flag = '--{module}-{option} {optional}{required}'.format(_.extend({
          option: option_name,
          module: phaseName,
        }, option_details));

        install.option(flag, option_details.description);

        // set default values
        options[phaseName][option_name] = option_details.value;
      }
      catch (e) {
        installer.log({ msg: e.stack, prefix: format_prefix(phaseName, taskName) });
        installer.log({ msg: 'See log for error details.', prefix: format_prefix(phaseName, taskName) }, true);
        installer.die({ msg: e.message, prefix: format_prefix(phaseName, taskName) });
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
  installer.eachTask(function (task, phaseName, taskName) {
    var invalidOptions = _.filter(task.options, function (option, key) {
      return _.isString(option.required) && _.isUndefined(options[phaseName][key]);
    });

    if (invalidOptions.length > 0) {
      installer.die({ msg: JSON.stringify(invalidOptions, null, 2) });
    }
  });

  // print plan
  _.each(plan, function (phase) {
    installer.log({ msg: 'Module: {name}'.format(phase) }, true);
    installer.log({ msg: '  Tasks: ' + JSON.stringify(phase.tasks) }, true);
    installer.log({ msg: '  Arguments: '+ JSON.stringify(options[phase.name], null, 2) }, true);
  });

  prompt.get('Press Enter to confirm the Installation Plan:', function(err, result) {
    //process.emit('init', options);

    // beforeInstall
    installer.eachTask(function (task, phaseName, taskName) {
      task.beforeInstall(options);
    });

    // run installer tasks
    installer.eachTask(function (task, phaseName, taskName) {
      task.beforeTask(options);
      task.doTask(options);
      task.afterTask(options);
    });

    // afterInstall
    installer.eachTask(function (task, phaseName, taskName) {
      task.afterInstall(options);
    });

    current = logo_lines.length;
    //installer.log_progress({ phase: 'installer', task: 'installer', msg: 'Done!'});
    process.exit(0);
  });
})();
