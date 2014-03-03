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
    _ = require('underscore'),
    xtVersion;


  program.version('1.7.2')
    .command('install')
    .option('--dbadmin-pw <pw>',  'Database admin password (required for production install)')
    .option('--require-tests',    'Require all tests to pass for install completion')
    .option('--log-file <file>',  'Specify logfile in which to append installation log output');

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
        tasks: [ 'cluster', 'config', 'hba' ],
      },
      {
        module: 'nginx',
        name: 'NGINX',
        tasks: [ 'config', 'ssl' ],
      },
      {
        module: 'xt',
        name: 'xTuple Mobile',
        tasks: [ 'fetch', 'server-config', 'test-config', 'database', 'extensions', 'test' ],
      }
    ],
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
    log = function (msg, source, stdout) {
      var src = source || 'xtuple',
        str = '[{source}] {msg}'.format({ source: loglevel[src](src), msg: loglevel[src](msg) });
      if (stdout) {
        console.log(loglevel[src](str));
      }
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

  log('Validating Parameters...', true);
  log('{argv}'.format({ argv: process.argv.join('\n   >> ') }), true);

  if (!_.isString(program.dbadminPw)) {
    die('--dbadmin-pw must be supplied');
    process.exit(1);
  }
  if (/xtuple|admin/i.test(program.dbadminPw)) {
    die('"{dbadminPw}" is not a password.'.format(program));
    process.exit(1);
  }

  log('OK!\n', true);
  log('Compiling Installation Plan...', true);
  _.each(plan, function (step) {
    var module = require(path.resolve(wd, '..', step.module));
    _.each(step.tasks, function (task) {
      log('Module: {module}'.format(step), true);
      _.each(module.options, function (option, name) {
        program.option('{module}-{name} {optional}{required}'
          .format(_.extend({ name: name }, option)), option.description);
        log('   Task: ' + task, true);
      });
    });
  });
  program.parse(process.argv);
  log('OK!\n', true);
  console.log('\u001b[2J\u001b[0;0H');  // clear console
  log('Installing...\n');
  _.each(plan, function (step) {
    var module = require(path.resolve(wd, '..', step.module));
    _.each(step.tasks, function (step) {
      //module[step]();
    });
  });
  progress(totaltasks);
  
})();
