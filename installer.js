(function () {
  'use strict';

  /**
   * Installer
   */
  var installer = exports;

  var planner = require('./lib/planner'),
    fs = require('fs'),
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
    install = Commander.version('1.8.0').command('install')
      .option('-p --plan', 'Path to planfile'),
    options = { },
    plan = require('./plan');

  if (!_.isObject(plan)) {
    throw new Error('No planfile found');
  }

  // self-tests
  if (exec('id -u').stdout.indexOf('0') !== 0) {
    planner.die({ msg: 'Installer must be run as root', prefix: 'xtuple' });
  }

  fs.writeFileSync(planner.logfile, os.EOL);

  // compile Commander's options list. I wish it accepted a json object; instead
  // we must populate it via api calls
  planner.eachTask(plan, function (task, phaseName, taskName) {
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
        planner.log({ msg: e.stack, prefix: planner.format_prefix(phaseName, taskName) });
        planner.log({ msg: 'See log for error details.', prefix: planner.format_prefix(phaseName, taskName) }, true);
        planner.die({ msg: e.message, prefix: planner.format_prefix(phaseName, taskName) });
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
  planner.eachTask(plan, function (task, phaseName, taskName) {
    var invalidOptions = _.filter(task.options, function (option, key) {
      return _.isString(option.required) && _.isUndefined(options[phaseName][key]);
    });

    if (invalidOptions.length > 0) {
      planner.die({ msg: JSON.stringify(invalidOptions, null, 2) });
    }
  });

  // print plan
  _.each(plan, function (phase) {
    planner.log({ msg: 'Module: {name}'.format(phase) }, true);
    planner.log({ msg: '  Tasks: ' + JSON.stringify(phase.tasks) }, true);
    planner.log({ msg: '  Arguments: '+ JSON.stringify(options[phase.name], null, 2) }, true);
  });

  prompt.get('Press Enter to confirm the Installation Plan', function(err, result) {
    planner.install(plan, options);

    //current = logo_lines.length;
    planner.log_progress({ phase: 'installer', task: 'installer', msg: 'Done!'});
  });
})();
