var pkg = require('../package');
var semver = require('semver');
var fs = require('fs');
var path = require('path');
var Mocha = require('mocha');
var glob = require('glob');
var n = require('n-api');

global.log = require('npmlog');
log.heading = 'xtuple-server';
log.level = 'verbose';

process.on('exit', function () {
  n(semver.clean(pkg.engines.node));
});

exports.run = function () {

  var mocha = new Mocha({
    bail: true,
    reporter: 'spec'
  });

  mocha.files = glob.sync(path.resolve(process.cwd(), 'spec/*.js'));

  mocha.run()
    .on('fail', function (test, err) {
      log.error('test', err.stack.split('\n'));
      log.info('test', 'Please see xtuple-server-test.log for more info');
      fs.appendFileSync('xtuple-server-error.log', JSON.stringify(log.record, null, 2));
      process.exit(1);
    });
};

if (!process.env.NODE_VERSION) {
  n(semver.clean(pkg.engines.node));
  log.warn('node', 'NODE_VERSION not set. Defaulting to', n.current());
}

if (require.main === module) {
  exports.run();
}
