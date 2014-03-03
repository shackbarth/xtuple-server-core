var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore');

_.mixin(require('congruence'));

describe('nginx', function () {

  describe('#create()', function () {
    it('should generate a correct nginx config', function () {
      var nginx = require('../nginx'),
        conf = nginx.create({
          ssldomain: 'kellyhayes.com',
          pem: '/srv/ssl/nginx.pem',
          key: '/srv/ssl/nginx.key',
          dry: true
        });

      assert.match(conf, /ssl_certificate_key \/srv\/ssl\/kellyhayes.com.key/);
      assert.match(conf, /ssl_certificate \/srv\/ssl\/kellyhayes.com.pem/);
    });
  });
});
