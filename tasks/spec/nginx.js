var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore'),
  exec = require('execSync').exec,
  path = require('path'),
  fs = require('fs');

_.mixin(require('congruence'));

describe('phase: nginx', function () {
  var nginx = require('../nginx');

  describe('sanity', function () {
    it('should exist', function () {
      assert(nginx);
    });
    it('should export tasks', function () {
      assert(nginx.ssl);
      assert(nginx.site);
    });
  });

  describe('task: ssl', function () {
    var ssl = require('../nginx/ssl'),
      $k = Math.round((Math.random() * 2e16)).toString(16),
      options = {
        nginx: {
          incrt: path.resolve('/srv/ssl/', 'localhost' + $k +'.crt'),
          inkey: path.resolve('/srv/ssl/', 'localhost' + $k +'.key')
        }
      };

    beforeEach(function () {
      ssl.generate('/srv/ssl/', 'localhost' + $k);
    });
    afterEach(function () {
      exec('rm -rf /srv/ssl/localhost' + $k + '*');
    });

    describe('#verifyCertificate', function () {
      it('should verify a legit cert', function () {
        assert(ssl.verifyCertificate(options));
      });
      it('should reject a non-existent .crt', function () {
        assert.throws(function () {
            ssl.verifyCertificate({
              nginx: {
                incrt: 'akjdakjdn',
                inkey: options.nginx.incrt
              }
            });
          }, Error);
      });
      it('should reject a non-existent .key', function () {
        assert.throws(function () {
            ssl.verifyCertificate({
              nginx: {
                incrt: options.nginx.incrt,
                inkey: 'akjdakjdn'
              }
            });
          }, Error);
      });
      it('should reject bad cert', function () {
        fs.writeFileSync(options.nginx.incrt, 'OHAI');

        assert.throws(function () {
          ssl.verifyCertificate(options);
        }, Error, /x509 verify/);

      });
      it('should reject wrong private key', function () {
        ssl.generate('/srv/ssl/', 'localhost' + $k + '-2');
        var badkey = '/srv/ssl/localhost' + $k + '-2.key';
        assert.throws(function () {
            ssl.verifyCertificate({
              nginx: {
                incrt: options.nginx.incrt,
                inkey: badkey
              }
            });
          }, Error, /moduli inconsistent/);

      });
    });
    describe('#bundleCertificate', function () {
      if (!fs.existsSync(path.resolve('test_chain.zip'))) {
        this.pending = true;

        console.log();
        console.log('>> '+ this.title + ': copy a real trust chain archive + key to:');
        console.log('>> '+ this.title + ': '+ path.resolve('test_chain.zip'));
        console.log('>> '+ this.title + ': '+ path.resolve('test_chain.key'));
      }

      var options = {
        nginx: {
          inzip: path.resolve('test_chain.zip'),
          inkey: path.resolve('test_chain.key'),
          incrt: path.resolve('test_chain.crt')
        }
      };
      it('should bundle a trusted chain [see output above if skipped]', function () {
        assert(ssl.createBundle(options));
      });
      it('should verify a legit cert', function () {
        assert(ssl.verifyCertificate(options));
      });
      after(function () {
        exec('rm -rf '+ options.nginx.incrt);
      });
    });
  });

  describe('task: site', function () {
    var site = nginx.site;

    describe('#run', function () {
      it('should generate a correct nginx config', function () {

        var conf = site.run({
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
