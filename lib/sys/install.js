(function () {
  'use strict';

  var fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    prompt = require('prompt'),
    Commander = require('commander'),
    clc = require('cli-color'),
    S = require('string'),
    _ = require('underscore'),
    usage = '',
    command = Commander.version('1.7.2').command('install'),
    runargs = { };

  command
    .option('--require-tests [false]',          'Require all tests to pass for install completion')
    .option('--log-file [xtuple-install.log]',  'Specify logfile in which to append installation log output');

  var wd = __dirname,
    logo_orange = fs.readFileSync(path.resolve(wd, './x-orange.ascii'), 'ascii').trim(),
    logo_blue = fs.readFileSync(path.resolve(wd, './x-blue.ascii'), 'ascii').trim(),
    logo_lines = _.map(
      _.object(logo_orange.split('\n'), logo_blue.split('\n')),
      function (blue, orange) {
        var orangeterm = clc.xterm(202),
          blueterm = clc.xterm(39);
        return orangeterm(orange) + blueterm(blue);
      }
    ),
    loglevel = {
      error: clc.red.bold,
      warn: clc.yellow.bold,
      xtuple: clc.xterm(255),
      nginx: clc.xterm(40),
      pg: clc.xterm(38)
    },
    modes = {
      production: command.production,
      staging: command.staging,
      development: command.development
    },
    mode = _.find(_.keys(modes), _.partial(_.result, modes)),
    plan = [
      {
        name: 'pg',
        description: 'Postgres Cluster',
        tasks: [ 'config', 'cluster', 'init', 'hba' ],
      },
      {
        name: 'nginx',
        description: 'NGINX',
        tasks: [ 'config', 'ssl' ],
      },
      {
        name: 'xt',
        description: 'xTuple Mobile',
        tasks: [ 'server-config', 'test-config', 'database'/*, 'test'*/ ],
      }
    ],
    current = 0,
    lines = logo_lines.length,
    totaltasks = _.flatten(_.pluck(plan, 'tasks')).length,
    tick = Math.floor(lines / totaltasks),
    queue = [ ],
    progress = function (tasks) {
      _.each(_.range((tasks || 1) * tick), function (i) {
        queue.push(logo_lines[current]);
        current++;
      });
    },
    queueInterval = setInterval(function () {
      var line = queue.shift();
      if (line && _.isString(line)) {
        console.log(line);
      }
      if (current === lines && _.isEmpty(queue)) {
        complete();
      }
    }, 200),
    complete = function () {
      console.log();
      log('Installation Complete!', true);
      console.log();
      clearInterval(queueInterval);
      process.exit(0);
    },
    log = function (msg, stdout) {
      if (stdout) {
        console.log(msg);
      }
      if (_.isString(command.logFile)) {
        fs.appendFile(command.logFile, msg);
      }
    },
    die = function (msg) {
      console.log();
      log(loglevel.error(msg), true);
      console.log();
      clearInterval(queueInterval);
      process.exit(1);
    };

  var installer = exports;

  _.extend(installer, /** @exports installer */ {

    run: function (_options) {
      var options = _.extend({ }, _options);
      console.log('\u001b[2J\u001b[0;0H');  // clear console

      log('Installing...\n', true);
      var stepdata = { };
      _.each(plan, function (step) {
        log('  Running module: {name}...'.format(step));

        var taskdata = { }, taskargs = { };
        stepdata[step.name] = taskdata;

        _.each(step.tasks, function (task) {
          var taskmodule = require(path.resolve(wd, '..', step.name, task)),
            taskoptionkeys = _.keys(taskmodule.options),
            defaultargs = _.object(taskoptionkeys, _.map(taskoptionkeys, function (key) {
              return taskmodule.options[key].value || '';
            })),
            commandargs = _.object(taskoptionkeys, _.map(taskoptionkeys, function (key) {
              var commandkey = S('{name}-{key}'.format({ name: step.name, key: key }))
                .camelize().s;

              return command[commandkey];
            }));

          _.defaults(taskargs, commandargs, defaultargs);

          setTimeout(function () {
            try {
              taskdata[task] = taskmodule.run(_.defaults(stepdata, taskargs));
            //log('  {name} result: {result}'.format({ name: task, result: JSON.stringify(taskdata[task]) }), true);
            }
            catch (e) {
              die(e.message);
              //throw e;
            }
          }, 10);
          progress(1);
        }, { });
      }, { });
    }
  });
  log('Validating Parameters...', true);
  log('{argv}'.format({ argv: process.argv.join('\n   >> ') }), true);

  log('OK!\n', true);
  log('Compiling Installation Plan...', true);
  _.each(plan, function (step) {
    log('Module: {name}'.format(step), true);

    _.each(step.tasks, function (task) {
      log('  Task: ' + task, true);
      log('    Options:', true);
      try {
        var taskmodule = require(path.resolve(wd, '..', step.name, task)),
          options = _.defaults({ }, taskmodule.options);
        _.each(options, function (details, option) {
          var extended = _.extend({
              option: option,
              module: step.name,
              task: task
            }, step, details),
            flag = '--{module}-{option} {optional}{required}'.format(extended);
          command.option(flag, details.description);
          // set default value
          (runargs[step.name] || (runargs[step.name] = { }));
          runargs[step.name][option] = details.value;

          log('    ' + flag, true);
        });
      }
      catch (e) {
        die(e.message);
      }
    });
  });
  log('OK!\n', true);
  log('Please verify that the Installation Plan is Correct.', true);
  command.parse(process.argv);
  command.usage(
    _.reduce(_.where(command.options, { optional: 0 }), function (memo, option) {
      return memo + ' ' + option.flags;
    }, ''));

  if (/xtuple|admin/i.test(command.pgDbadminPw)) {
    die('"{pgDbadminPw}" is not a password.'.format(command));
    process.exit(1);
  }

  prompt.get('Press Enter to Continue', function(err, result) {
    installer.run(runargs);
  });

})();
