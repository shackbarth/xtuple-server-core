var exec = require('child_process').execSync;
var assert = require('chai').assert;
var fs = require('fs');

describe('cli', function () {

  it('should be installed globally', function () {
    assert(fs.existsSync('/usr/local/bin/xtuple-server'), 'xtuple-server not installed globally');
  });

  describe('plans', function () {

    describe('uninstall-dev', function () {
      it('should do something', function () {
        exec([

          'xtuple-server uninstall-dev',
          '--local-workspace ./node_modules/xtuple',
          '--verbose'

        ].join(' '), {
          stdio: 'inherit'
        });
      });
    });


  });

  describe.skip('info', function () {

  });
});
