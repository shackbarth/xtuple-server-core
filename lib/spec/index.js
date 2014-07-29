global.log = require('npmlog');
log.heading = 'xtuple-server-lib';
log.level = 'verbose';

var assert = require('assert');
var lib = require('../');

require('../pg-cli/spec');

describe('util', function () {

  describe('#getDatabaseName', function () {
    it('should sanitize a .dirgz database import', function () {
      var filename = 'a/b/c/foo.dirgz';
      var dbname = lib.util.getDatabaseName(filename, 'dev');

      assert.equal(dbname, 'foo_dev');
    });
    it('should sanitize a .backup database import', function () {
      var filename = 'a/b/c/foo.backup';
      var dbname = lib.util.getDatabaseName(filename, 'dev');

      assert.equal(dbname, 'foo_dev');
    });
    it('should sanitize utter craziness', function () {
      var filename = 'a/b happy foo/c/foo--_ bar4.5.0.backup';
      var dbname = lib.util.getDatabaseName(filename, 'dev');

      assert.equal(dbname, 'foo_bar450_dev');
    });
  });

  describe('$', function () {
    it('should properly distill options into an id', function () {
      assert.equal(lib.util.$({ xt: { name: 'tjwebb', version: '4.5.1' }, type: 'pilot' }), 'tjwebb-451-pilot');
      assert.equal(lib.util.$({ xt: { name: 'tjwebb', version: 'a38ed1fb' }, type: 'pilot' }), 'tjwebb-a38ed1fb-pilot');
    });
  });

});
