var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore');

_.mixin(require('congruence'));

describe('nginx', function () {

  describe('.ssl', function () {
    var ssl = require('../nginx/ssl');

    describe('#run()', function () {

      it('should fail if no ssl options are set', function () {
        assert.throws(
          _.partial(ssl.run, { nginx: { domain: 'example.com', ssl: { } }}),
          'No SSL parameters set.'
        );
      });
    });
  });

  describe('.config', function () {

    describe('#run()', function () {
      it('should generate a correct nginx config', function () {
        var config = require('../nginx/config'),

          conf = config.run({
            xt: {
              domain: 'kellyhayes.com',
              pem: '/srv/ssl/nginx.pem',
              key: '/srv/ssl/nginx.key'
            },
            dry: true
          }).string;

        assert.match(conf, /ssl_certificate_key \/srv\/ssl\/kellyhayes.com.key/);
        assert.match(conf, /ssl_certificate \/srv\/ssl\/kellyhayes.com.pem/);
      });
    });

  });
});
