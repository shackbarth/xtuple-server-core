#! /usr/bin/env node

var lib = require('xtuple-server-lib'),
  format = require('string-format'),
  exec = require('execSync').exec,
  S = require('string'),
  _ = require('lodash'),
  program = require('commander'),
  planner = require('./'),
  plans = require('./plans');

if (exec('id -u').stdout.indexOf('0') !== 0) {
  planner.die({ msg: 'Must be run as root', prefix: 'xtuple' }, { });
}

program
  .version(require('./package').version)
  .usage('<plan> <type> [options]');

program._name = 'xtuple-server';

_.each(plans, function (plan, name) {
  var options = { planName: name };
  var cmd = program
    .command(name)
    .description(plan.description + ' <type>')
    .action(function (type) {
      if (_.isUndefined(plan.types)) {
        type = 'setup';
      }
      else if (plan.types !== 'all') {
        if (plan.types.length === 1 && !_.isString(type)) {
          type = plan.types[0];
        }
        if (!_.contains(plan.types, type)) {
          throw new TypeError('plan "' + name + '" does not support type "' + type + '"');
        }
      }

      if (!_.isString(type)) {
        throw new TypeError('A type is required. See --help');
      }
      options.type = type;
      compilePlan(cmd, plan.plan, options);
      setTimeout(_.partial(executePlan, plan.plan, options), 0);
    });

  preparePlan(cmd, plan.plan, options);
});

program.command('*').action(function (cmd) {
  console.error('Plan not found:', cmd);
});

program.parse(process.argv);

/**
 * compile Commander's options list. I wish it accepted a json object; instead
 * we must populate it via api calls
 */
function preparePlan (program, plan, options) {
  planner.eachTask(plan, function (task, phase, taskName) {
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
        planner.log({ msg: e.stack, prefix: planner.format_prefix(phase.name, taskName) });
        planner.log({
          msg: 'See log for error details.',
          prefix: planner.format_prefix(phase.name, taskName)
        }, true);
        planner.die({ msg: e.message, prefix: planner.format_prefix(phase.name, taskName) }, options);
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

  planner.compileOptions(plan, options);
  planner.verifyOptions(plan, options);

  console.log('\nExecution Plan:\n');
  console.log(JSON.stringify(options, function (key, value) {
    return _.isEmpty(value) ? undefined : value;
  }, 2));
}

function executePlan (plan, options) {
  planner.execute(plan, options)
    .then(function () {
      planner.log_progress({ phase: 'planner', task: 'execute', msg: 'Done!'});
      process.exit(0);
    })
    .fail(function (error) {
      console.log(error);
      process.exit(0);
    });
}
