#! /usr/bin/env node

(function () {
  'use strict';

  /** sudo - xtdo */
  var installer = exports;

  var planner = require('./lib/planner'),
    fs = require('fs'),
    path = require('path'),
    pgcli = require('./lib/pg-cli'),
    format = require('string-format'),
    os = require('os'),
    exec = require('execSync').exec,
    clc = require('cli-color'),
    S = require('string'),
    _ = require('underscore'),
    program = require('commander'),
    version = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'))).version,
    options = { };

  program.command('<plan>').version(version);

  if (process.argv.length < 3) {
    console.log('Please see README for usage');
    process.exit(0);
  }

  var versionFlagIndex = _.indexOf(process.argv, '--xt-version'),
    versionNumber = process.argv[versionFlagIndex + 1],
    xtupleScripts = '/usr/local/xtuple/src/'+ versionNumber + '/xtuple-scripts',
    planFile = path.resolve(xtupleScripts, 'plans', process.argv[2] + '.json'),
    planExists = fs.existsSync(planFile),
    plan = planExists && require(planFile);

  if (versionFlagIndex === -1 || !planExists || !_.isObject(plan)) {
    throw new Error('No planfile found');
  }

  options.plan = process.argv[2];

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

        program.option(flag, option_details.description);

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

  // self-tests
  if (exec('id -u').stdout.indexOf('0') !== 0) {
    planner.die({ msg: 'Installer must be run as root', prefix: 'xtuple' });
  }

  // now that installer has parsed the arguments, go back through and override
  // default values with provided values. installer's automatic camelcasing of
  // arguments, as well as its strange setting of values directly on the
  // 'Commander' object unfortunately complicate this process somewhat.
  _.each(program.options, function (option) {
    var flag = option.long,
      cleanflag = option.long.replace('--', ''),
      prop = S(cleanflag).camelize().s,
      argpath = cleanflag.split('-');

    if (!argpath[1]) { return; }

    if (!_.isUndefined(program[prop])) {
      options[argpath[0]][argpath[1]] = program[prop];
    }
  });

  program.parse(process.argv);
  if (_.contains(process.argv, '--help')) {
    return program.help();
  }

  planner.verifyOptions(plan, options);
  planner.compileOptions(plan, options);
  planner.displayPlan(plan, options);

  program.confirm('Press Enter to Continue...', function(err, result) {
    planner.install(plan, options);
    planner.log_progress({ phase: 'installer', task: 'installer', msg: 'Done!'});
  });
})();
