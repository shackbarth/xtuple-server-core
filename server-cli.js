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
    sleep = require('sleep').sleep,
    os = require('os'),
    exec = require('execSync').exec,
    clc = require('cli-color'),
    S = require('string'),
    _ = require('lodash'),
    cli = require('commander'),
    pkg = require('./package'),
    help = _.contains(process.argv, '--help'),
    options = { },
    run = function (plan, options) {
      planner.execute(plan, options)
        .then(function () {
          planner.log_progress({ phase: 'planner', task: 'execute', msg: 'Done!'});
          process.exit(0);
        })
        .fail(function (error) {
          console.log(error);
          process.exit(0);
        });
    },
    originalOptions,
    resultingOptions;

  var program = cli.command('<plan>')
    .option('--xt-name <name>', 'Account name')
    .option('--xt-version <version>', 'xTuple version')
    .option('--sys-force', 'Force uninstall first');

  console.log('\nxTuple Server v'+ pkg.version);

  if (exec('id -u').stdout.indexOf('0') !== 0) {
    planner.die({ msg: 'Installer must be run as root', prefix: 'xtuple' });
  }

  if (process.argv.length < 3) {
    console.log(clc.yellow.bold('\nNo plan specified. Please see README for usage\n'));
    process.exit(0);
  }

  var xtupleScripts = process.env.SRCDIR || '/usr/local/lib/node_modules/xtuple-scripts/',
    planFile = path.resolve(xtupleScripts, 'plans', process.argv[2] + '.json'),
    planExists = fs.existsSync(planFile),
    plan = planExists && require(planFile);

  if (!planExists || !_.isObject(plan)) {
    console.error(clc.yellow.bold('\nNo planfile found at: '+ planFile + '\n'));
    process.exit(2);
  }

  options.plan = process.argv[2];

  // compile Commander's options list. I wish it accepted a json object; instead
  // we must populate it via api calls
  planner.eachTask(plan, function (task, phaseName, taskName) {
    options[phaseName] || (options[phaseName] = { });
    options[phaseName][taskName] || (options[phaseName][taskName] = { });

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

  program.parse(process.argv);

  // now that installer has compiled the arguments, go back through and override
  // default values with provided values. installer's automatic camelcasing of
  // arguments, as well as its strange setting of values directly on the
  // 'Commander' object unfortunately complicate this process somewhat.
  _.each(program.options, function (option, key) {
    var flag = option.long,
      cleanflag = option.long.replace('--', ''),
      prop = S(cleanflag).camelize().s,
      argpath = cleanflag.split('-');

    if (!argpath[1]) {
      //console.log(clc.yellow('Skipping argument: \n%j'), option);
      return;
    }

    options[argpath[0]] || (options[argpath[0]] = { });

    if (!_.isUndefined(program[prop])) {
      options[argpath[0]][argpath[1]] = program[prop];
    }
  });

  planner.compileOptions(plan, options);
  if (help) { return program.help(); }

  planner.verifyOptions(plan, options);

  console.log(clc.bold('\nExecution Plan:\n'));
  planner.displayPlan(plan, options);

  console.log(clc.green.bold('\nPlease verify the Execution Plan. Installation will begin in 10 seconds. Press Ctrl-C to cancel.'));
  sleep(15000);
  _.partial(run, plan, options);

})();
