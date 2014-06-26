var lib = require('xtuple-server-lib'),
  exec = require('execSync').exec,
  _ = require('lodash');

_.extend(exports, lib.task, /** @exports xtuple-server-sys-upgrade */ {

  executeTask: function (options) {
    console.log(process.cwd());
    console.log(options.pkg);

    exec('nde clean');

    if (options.pkg.private) {
      exec('git pull origin master');
    }

    exec('nde install');
    exec('npm update');
    exec('npm install -g');
  }

});
