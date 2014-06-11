var assert = require('chai').assert,
  _ = require('lodash'),
  fs = require('fs'),
  path = require('path'),
  sslTask = require('xtuple-server-nginx-ssl'),
  options = global.options;

describe('#verifyCertificate', function () {
  it('should verify a legit cert', function () {
    assert(sslTask.verifyCertificate(options));
  });
  it('should reject a non-existent .crt', function () {
    assert.throws(function () {
        sslTask.verifyCertificate({
          nginx: {
            outcrt: 'akjdakjdn',
            outkey: options.nginx.outcrt
          }
        });
      }, Error);
  });
  it('should reject a non-existent .key', function () {
    assert.throws(function () {
        sslTask.verifyCertificate({
          nginx: {
            outcrt: options.nginx.outcrt,
            outkey: 'akjdakjdn'
          }
        });
      }, Error);
  });
  it('should reject bad cert', function () {
    fs.writeFileSync(options.nginx.outcrt, 'OHAI');

    assert.throws(function () {
      sslTask.verifyCertificate(options);
    }, Error, /x509 verify/);

  });
  it('should reject wrong private key', function () {
    sslTask.generate(options);
    assert.throws(function () {
        sslTask.verifyCertificate({
          nginx: {
            outcrt: options.nginx.outcrt,
            outkey: path.resolve(__filename)
          }
        });
      }, Error, /moduli inconsistent/);

  });
});
