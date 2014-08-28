var assert = require('assert'),
  _ = require('lodash'),
  fs = require('fs'),
  path = require('path'),
  sslTask = require('xtuple-server-nginx-ssl');

exports.afterExecute = function (options) {

  describe('#verifyCertificate', function () {
    it('should verify a legit cert', function () {
      assert.ok(sslTask.verifyCertificate(options));
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
              // this test file (__filename) is obviously not a valid key
              outkey: path.resolve(__filename),
              outcrt: options.nginx.outcrt
            }
          });
        }, Error, /moduli inconsistent/);

    });
    it('should support multiple CNAMEs in openssl subj (subjectAltName', function () {
      options.nginx.sslcnames = [ 'IP:127.0.0.1', 'localhost', 'example.com' ];
      var cmd = sslTask.generate(options);
      assert(_.isString(cmd));
      console.log('subjectAltName command:', cmd);
    });
  });
};
