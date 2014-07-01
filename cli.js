#! /usr/bin/env node

var lib = require('xtuple-server-lib'),
  exec = require('child_process').execSync,
  _ = require('lodash'),
  program = require('commander'),
  fs = require('fs'),
  planner = require('./'),
  plans = require('./plans');

/**
 * compile Commander's options list. I wish it accepted a json object; instead
 * we must populate it via api calls
 */
function preparePlan (plan, options, cmd) {
  lib.util.eachTask(plan, function (task, phase, taskName) {
    options[phase.name] || (options[phase.name] = { });
    options[phase.name][taskName] || (options[phase.name][taskName] = { });

    _.each(task.options, function (option, name) {
      var stem = phase.name + '-' + name;
      var label = (option.required || option.optional);
      var flag = '--' + stem + (label ? (' ' + label) : '');

      cmd.option(flag, option.description, option.value);
      cmd.on(stem, function (value) {
        options[phase.name][name] = value || (option.optional === '[boolean]');
      });
    });
  });
}

function executePlan (plan, options) {

  planner.compileOptions(plan, options);
  planner.verifyOptions(plan, options);

  log.verbose('xtuple', 'Execution Plan: '),
      
  log.verbose('xtuple', JSON.stringify(options, function (key, value) {
    return _.isEmpty(value) ? undefined : value;
  }, 2).split('\n'));

  log.info('xtuple', 'Running plan ['+ options.planName + ']...');
  planner.execute(plan, options)
    .then(function () {
      log.info('xtuple', 'Done!');
      process.exit(0);
    })
    .fail(function (e) {
      log.error('xtuple', e.message);
      log.info('xtuple', 'Please see xtuple-server.log for more info');
      log.verbose('xtuple', e.stack.split('\n'));
      fs.appendFileSync('xtuple-server.log', JSON.stringify(log.record, null, 2));
      process.exit(1);
    });
}

if (exec('id -u', { stdio: 'pipe' }).toString().indexOf('0') !== 0) {
  log.error('access denied', 'This tool must be run with sudo');
  process.exit(1);
}

program
  .version(require('./package').version)
  .usage('<plan> <type> [options]')
  .option('-v, --verbose', 'verbose mode', function () {
    log.level = 'verbose';
  });

program._name = 'xtuple-server';

_.each(plans, function (plan, name) {
  log.verbose('xtuple', 'Compiling options for plan: '+ name);

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
      executePlan(plan.plan, options);
    });

  preparePlan(plan.plan, options, cmd);
});

program.command('*').action(function (cmd) {
  log.error('xtuple', 'Plan not found:' + cmd);
});

program.parse(process.argv);
