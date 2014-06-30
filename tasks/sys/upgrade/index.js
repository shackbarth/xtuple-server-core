var lib = require('xtuple-server-lib'),
  exec = require('child_process').execSync,
  _ = require('lodash');

_.extend(exports, lib.task, /** @exports xtuple-server-sys-upgrade */ {

  executeTask: function (options) {
    log.verbose('sys-upgrade', process.cwd());
    log.verbose('sys-upgrade', options.pkg);

    exec('nex clean');

    if (options.pkg.private) {
      exec('git pull origin master');
    }

    exec('npm install');
    exec('npm install -g');
  }

});
