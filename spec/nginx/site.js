var assert = require('chai').assert,
  options = global.options;

it('should use a valid upstream port', function () {
  var conf = options.nginx.site.string;
  assert.operator(options.nginx.port, '>=', 8443);
});
it('should generate a correct nginx config', function () {
  var conf = options.nginx.site.string;

  assert.match(conf, new RegExp('ssl_certificate_key '+ options.nginx.outkey));
  assert.match(conf, new RegExp('ssl_certificate '+ options.nginx.outcrt));
  assert.match(conf, new RegExp('server 127.0.0.1:{nginx.port};'.format(options)));
});
