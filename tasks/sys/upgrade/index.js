var lib = require('xtuple-server-lib'),
  exec = require('child_process').execSync,
  _ = require('lodash');

_.extend(exports, lib.task, /** @exports xtuple-server-sys-upgrade */ {

  /** @override */
  executeTask: function (options) {
    var pkg = require('./package');

    log.verbose('sys-upgrade cwd', process.cwd());
    log.verbose('sys-upgrade pkg', pkg);

    if (pkg.private === true) {
      exec('git pull origin master', { stdio: 'inherit' });
      exec('npm install --force --loglevel warn', { stdio: 'inherit' });
    }
    else {
      exec('npm update --global --loglevel warn ' + pkg.name, { stdio: 'inherit' });
    }
  }

});
