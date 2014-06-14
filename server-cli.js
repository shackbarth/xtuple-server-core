#! /usr/bin/env node

var lib = require('xtuple-server-lib'),
  format = require('string-format'),
  exec = require('execSync').exec,
  S = require('string'),
  _ = require('lodash'),
  program = require('commander'),
  plans = require('./plans');

if (exec('id -u').stdout.indexOf('0') !== 0) {
  lib.planner.die({ msg: 'Must be run as root', prefix: 'xtuple' }, { });
}

program.version(require('./package').version);

// load the available plans into the cli commands list
_.each(plans, function (plan, name) {
  var options = { planName: name };
  var cmd = program
    .command(name)
    .description(plan.description)
    .action(function () {
      compilePlan(cmd, plan.plan, options);
      setTimeout(_.partial(executePlan, plan.plan, options), 0);
    });

  preparePlan(cmd, plan.plan, options)
});

program.parse(process.argv);

/**
 * compile Commander's options list. I wish it accepted a json object; instead
 * we must populate it via api calls
 */
function preparePlan (program, plan, options) {
  lib.planner.eachTask(plan, function (task, phase, taskName) {
    options[phase.name] || (options[phase.name] = { });
    options[phase.name][taskName] || (options[phase.name][taskName] = { });

    _.each(task.options, function (option_details, option_name) {
      try {
        var flag = '--{module}-{option} {optional}{required}'.format(_.extend({
          option: option_name,
          module: phase.name,
        }, option_details));

        program.option(flag, option_details.description);

        // set default values
        options[phase.name][option_name] = option_details.value;
      }
      catch (e) {
        lib.planner.log({ msg: e.stack, prefix: lib.planner.format_prefix(phase.name, taskName) });
        lib.planner.log({
          msg: 'See log for error details.',
          prefix: lib.planner.format_prefix(phase.name, taskName)
        }, true);
        lib.planner.die({ msg: e.message, prefix: lib.planner.format_prefix(phase.name, taskName) }, options);
      }
    });
  });
}

/**
 * now that installer has compiled the arguments, go back through and override
 * default values with provided values. installer's automatic camelcasing of
 * arguments, as well as its strange setting of values directly on the
 * 'Commander' object unfortunately complicate this process somewhat.
 */
function compilePlan (program, plan, options) {
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

  lib.planner.compileOptions(plan, options);
  lib.planner.verifyOptions(plan, options);

  console.log('\nExecution Plan:\n');
  console.log(JSON.stringify(options, function (key, value) {
    return _.isEmpty(value) ? undefined : value;
  }, 2));
}

function executePlan (plan, options) {
  lib.planner.execute(plan, options)
    .then(function () {
      lib.planner.log_progress({ phase: 'planner', task: 'execute', msg: 'Done!'});
      process.exit(0);
    })
    .fail(function (error) {
      console.log(error);
      process.exit(0);
    });
}
