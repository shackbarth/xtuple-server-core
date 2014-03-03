(function () {
  'use strict';

  var pg = require('../pg'),
    nginx = require('../nginx'),
    exec = require('exec-sync'),
    fs = require('fs'),
    path = require('path'),
    format = require('string-format'),
    program = require('commander'),
    clc = require('cli-color'),
    Progress = require('progress'),
    _ = require('underscore');

  program.version('1.7.2')
    .option('--production',       'Perform a production installation')
    .option('--staging',          'Perform a staging/pilot installation')
    .option('--development',      'Perform a development installation')
    .option('--dbadmin-pw <pw>',  'Specific Database admin password (required for production install)')
    .option('--require-tests',    'Require all tests to pass for install completion')
    .option('--log-file <file>',  'Specify logfile in which to append installation log output')
    .parse(process.argv);

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
      production: program.production,
      staging: program.staging,
      development: program.development
    },
    mode = _.find(_.keys(modes), _.partial(_.result, modes)),
    plan = [
      {
        module: 'pg',
        name: 'Postgres Cluster',
        tasks: [ 'create', 'tune', 'secure' ],
      },
      {
        module: 'nginx',
        name: 'NGINX',
        tasks: [ 'create', 'ssl' ],
      },
      {
        module: 'xt',
        name: 'xTuple Mobile',
        tasks: [ 'config', 'test-config', 'database', 'extensions', 'test' ],
      }
    ],
    plan_string = _.reduce(plan, function (memo, step, i) {
      return memo + '  + {name} ({module})'.format(step) +
        _.reduce(step.tasks, function (memo, task) {
          return memo + '\n    - {task}'.format({ task: task });
        }, '') + '\n';
    }, ''),
    current = 0,
    lines = logo_lines.length,
    totaltasks = _.flatten(_.pluck(plan, 'tasks')).length,
    tick = lines / totaltasks,
    queue = [ ],
    progress = function (tasks) {
      _.each(_.range(Math.round(tasks * tick) || 1), function (i) {
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
    }, 500),
    complete = function () {
      console.log();
      log('Installation Complete!');
      console.log();
      clearInterval(queueInterval);
      process.exit(0);
    },
    log = function (msg, source) {
      var src = source || 'xtuple',
        str = '[{source}] {msg}'.format({ source: loglevel[src](src), msg: loglevel[src](msg) });
      console.log(loglevel[src](str));
      if (_.isString(program.logFile)) {
        fs.appendFileSync(program.logFile, str);
      }
    },
    die = function (msg) {
      console.log();
      log(loglevel.error(msg));
      console.log();
      clearInterval(queueInterval);
      process.exit(1);
    };

  log('Validating Parameters...');
  log('{argv}'.format({ argv: process.argv.join('\n   >> ') }));

  if (!_.isString(program.dbadminPw)) {
    die('--dbadmin-pw must be supplied');
    process.exit(1);
  }
  if (_.contains(['xtuple', 'admin'], program.dbadminPw)) {
    die('"{dbadminPw}" is not a password.'.format(program));
    process.exit(1);
  }

  log('OK!');
  log('\nInstallation Plan:\n');
  log(plan_string);
  console.log('\u001b[2J\u001b[0;0H');
  log('Installing...\n');
  _.each(plan, function (step) {
    var module = require(path.resolve(wd, '..', step.module));
    _.each(step.tasks, function (step) {
      //module[step]();
    });
  });
  progress(totaltasks);
  
})();
