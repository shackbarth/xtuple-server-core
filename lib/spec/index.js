global.log = require('npmlog');
log.heading = 'xtuple-server-lib';
log.level = 'verbose';

var assert = require('assert');
var lib = require('../');

require('../pg-cli/spec');

describe('util', function () {

  describe('$', function () {
    it('should properly distill options into an id', function () {
      assert.equal(lib.util.$({ xt: { name: 'tjwebb', version: '4.5.1' }, type: 'pilot' }), 'tjwebb-451-pilot');
      assert.equal(lib.util.$({ xt: { name: 'tjwebb', version: 'a38ed1fb' }, type: 'pilot' }), 'tjwebb-a38ed1fb-pilot');
    });
  });

});
