var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore'),
  exec = require('execSync').exec,
  path = require('path'),
  fs = require('fs');

_.mixin(require('congruence'));

describe('phase: nginx', function () {
  var nginxPhase = require('../nginx'),
    options = global.options;

  it('is sane', function () {
    assert(nginxPhase);
    assert(nginxPhase.ssl);
    assert(nginxPhase.site);
  });

  describe('task: ssl', function () {
    beforeEach(function () {
      nginxPhase.ssl.beforeTask(options);
    });
    afterEach(function () {
      exec('rm -f '+ options.nginx.outcrt);
      exec('rm -f '+ options.nginx.outkey);
    });

    describe('#verifyCertificate', function () {
      it('should verify a legit cert', function () {
        assert(nginxPhase.ssl.verifyCertificate(options));
      });
      it('should reject a non-existent .crt', function () {
        assert.throws(function () {
            nginxPhase.ssl.verifyCertificate({
              nginx: {
                incrt: 'akjdakjdn',
                inkey: options.nginx.incrt
              }
            });
          }, Error);
      });
      it('should reject a non-existent .key', function () {
        assert.throws(function () {
            nginxPhase.ssl.verifyCertificate({
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
          nginxPhase.ssl.verifyCertificate(options);
        }, Error, /x509 verify/);

      });
      it('should reject wrong private key', function () {
        nginxPhase.ssl.generate(options);
        assert.throws(function () {
            nginxPhase.ssl.verifyCertificate({
              nginx: {
                incrt: options.nginx.incrt,
                inkey: path.resolve(__filename)
              }
            });
          }, Error, /moduli inconsistent/);

      });
    });
    describe('#createBundle', function () {
      if (!fs.existsSync(path.resolve('test_chain.zip'))) {
        this.pending = true;

        console.log();
        console.log('>> '+ this.title + ': Skipping');
        console.log('>> '+ this.title + ': to run this suite, copy a real trust chain archive + key to:');
        console.log('>> '+ this.title + ': '+ path.resolve('test_chain.zip'));
        console.log('>> '+ this.title + ': '+ path.resolve('test_chain.key'));
      }

      var nginxOptions = _.clone(options.nginx);

      beforeEach(function () {
        _.extend(options.nginx, {
          inzip: path.resolve('test_chain.zip'),
          inkey: path.resolve('test_chain.key'),
          incrt: path.resolve('test_chain.crt')
        });
      });
      after(function () {
        _.extend(options.nginx, nginxOptions);
        delete options.nginx.inzip;
      });

      it('should bundle a trusted chain', function () {
        assert(nginxPhase.ssl.createBundle(options), 'createBundle did not return true');
      });
      it('should verify a legit bundle', function () {
        assert(nginxPhase.ssl.verifyCertificate(options), 'verifyCertificate did not return true');
      });
    });
  });

  describe('task: site', function () {
    describe('#run', function () {
      beforeEach(function () {
        nginxPhase.ssl.beforeTask(options);
        nginxPhase.site.beforeTask(options);
      });

      it('should generate a correct nginx config', function () {
        var conf = nginxPhase.site.doTask(options).string;

        assert.match(conf, new RegExp('ssl_certificate_key '+ options.nginx.outkey));
        assert.match(conf, new RegExp('ssl_certificate '+ options.nginx.outcrt));
      });
    });
  });
});
