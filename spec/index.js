var log = require('npmlog');
var fs = require('fs');
var path = require('path');
var Mocha = require('mocha');
var glob = require('glob');

var mocha = new Mocha({
  bail: true,
  reporter: 'spec'
});

mocha.files = glob.sync(path.resolve(__dirname, '*.js'));

var runner = mocha.run(function () {
    fs.appendFileSync('xtuple-server-pass.log', JSON.stringify(log.record, null, 2));
  })
  .on('fail', function (test, err) {
    log.error('test', err.stack.split('\n'));
    log.info('test', 'Please see xtuple-server-test.log for more info');
    fs.appendFileSync('xtuple-server-error.log', JSON.stringify(log.record, null, 2));
    process.exit(1);
  });
