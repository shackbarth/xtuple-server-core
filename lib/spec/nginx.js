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
          writeconfig: false
        });

      console.log(conf);
    });
  });
});
