var assert = require('assert'),
  fs = require('fs');

exports.afterExecute = function (options) {

  it('should use a valid upstream port', function () {
    var conf = options.nginx.site.string;
    assert.ok(options.nginx.port >= 8443, 'port < 8433. not in valid range');
  });
  it.skip('should generate a correct nginx config', function () {
    var conf = fs.readFileSync(options.nginx.siteEnabled).toString();

    assert.ok(new RegExp('ssl_certificate_key '+ options.nginx.outkey).test(conf));
    assert.ok(new RegExp('ssl_certificate '+ options.nginx.outcrt).test(conf));
    assert.ok(new RegExp('server 127.0.0.1:{nginx.port};'.format(options)).test(conf));
  });
  it('should increase the name size constraint', function () {
    var conf = fs.readFileSync('/etc/nginx/nginx.conf').toString();
    assert(conf.indexOf('# server_names_hash_bucket_size 64') !== -1);
  });

};
