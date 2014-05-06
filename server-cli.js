#! /usr/bin/env node

(function () {
  'use strict';

  var installer = exports;

  var planner = require('./lib/planner'),
    fs = require('fs'),
    path = require('path'),
    json = require('prettyjson'),
    pgcli = require('./lib/pg-cli'),
    format = require('string-format'),
    sleep = require('sleep').sleep,
    os = require('os'),
    exec = require('execSync').exec,
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
    .option('--xt-version <version>', 'xTuple version');

  console.log('\nxTuple Server v'+ pkg.version);

  if (exec('id -u').stdout.indexOf('0') !== 0) {
    planner.die({ msg: 'Installer must be run as root', prefix: 'xtuple' }, { });
  }

  if (process.argv.length < 3) {
    console.log('\nNo plan specified. Please see README for usage\n');
    process.exit(0);
  }

  var xtupleScripts = process.env.XTSERVER_SRCDIR || '/usr/local/lib/node_modules/xtuple-scripts/',
    planFile = path.resolve(xtupleScripts, 'plans', process.argv[2] + '.json'),
    planExists = fs.existsSync(planFile),
    plan = planExists && require(planFile);

  if (!planExists || !_.isObject(plan)) {
    console.error('\nNo planfile found at: '+ planFile + '\n');
    process.exit(2);
  }

  options.planName = process.argv[2];

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
        planner.die({ msg: e.message, prefix: planner.format_prefix(phaseName, taskName) }, options);
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

    if (!argpath[1]) { return; }

    options[argpath[0]] || (options[argpath[0]] = { });

    if (!_.isUndefined(program[prop])) {
      options[argpath[0]][argpath[1]] = program[prop];
    }
  });

  if (help) { return program.help(); }

  planner.compileOptions(plan, options);
  planner.verifyOptions(plan, options);

  console.log('\nExecution Plan:\n');
  planner.displayPlan(plan, options);

  run(plan, options);

})();
