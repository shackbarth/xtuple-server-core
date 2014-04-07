var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore'),
  exec = require('execSync').exec,
  path = require('path'),
  fs = require('fs'),
  pgcli = require('../../lib/pg-cli'),
  planner = require('../../lib/planner');

_.mixin(require('congruence'));

describe('phase: nginx', function () {
  var pgPhase = require('../pg'),
    sysPhase = require('../sys'),
    nginxPhase = require('../nginx'),
    xtPhase = require('../xt'),
    options;

  beforeEach(function () {
    options = global.options;
  });

  it('is sane', function () {
    assert(nginxPhase);
    assert(nginxPhase.ssl);
    assert(nginxPhase.site);
  });

  describe('task: ssl', function () {
    afterEach(function () {
      exec('rm -f '+ options.nginx.outcrt);
      exec('rm -f '+ options.nginx.outkey);
    });

    describe('#doTask', function () {
      beforeEach(function () {
        options.nginx.incrt = '/tmp/mocha-'+ options.xt.name +'.crt';
        options.nginx.inkey = '/tmp/mocha-'+ options.xt.name +'.key';
      });

      it('should reject invalid nginx.outcrt and nginx.outkey', function () {
        assert.throws(function () {
          nginxPhase.ssl.doTask(options);
        }, Error, /cannot find file/);

      });
    });

    describe('#verifyCertificate', function () {
      it('should verify a legit cert', function () {
        assert(nginxPhase.ssl.verifyCertificate(options));
      });
      it('should reject a non-existent .crt', function () {
        assert.throws(function () {
            nginxPhase.ssl.verifyCertificate({
              nginx: {
                outcrt: 'akjdakjdn',
                outkey: options.nginx.outcrt
              }
            });
          }, Error);
      });
      it('should reject a non-existent .key', function () {
        assert.throws(function () {
            nginxPhase.ssl.verifyCertificate({
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
          nginxPhase.ssl.verifyCertificate(options);
        }, Error, /x509 verify/);

      });
      it('should reject wrong private key', function () {
        nginxPhase.ssl.generate(options);
        assert.throws(function () {
            nginxPhase.ssl.verifyCertificate({
              nginx: {
                outcrt: options.nginx.outcrt,
                outkey: path.resolve(__filename)
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

      beforeEach(function () {
        options.nginx.inzip = path.resolve('test_chain.zip');
      });

      it('should bundle a trusted chain', function () {
        assert(nginxPhase.ssl.createBundle(options), 'createBundle did not return true');
      });
      it('should verify a legit bundle', function () {
        //nginxPhase.ssl.doTask(options);
        assert(nginxPhase.ssl.verifyCertificate(options), 'verifyCertificate did not return true');
      });
    });
  });

  describe('task: site', function () {
    /** Create clean cluster for each test */
    beforeEach(function () {
      planner.verifyOptions(global.baseClusterInstallPlan, options);
      planner.compileOptions(global.baseClusterInstallPlan, options);
      planner.install(global.baseClusterInstallPlan, options);

      pgPhase.snapshotmgr.beforeTask(options);
    });
    afterEach(function () {
      pgcli.dropcluster(global.options.pg.cluster);
    });
    describe('#doTask', function () {
      beforeEach(function () {
        nginxPhase.ssl.beforeTask(options);
        nginxPhase.site.beforeTask(options);
      });

      it('should generate a correct nginx config', function () {
        nginxPhase.site.doTask(options);
        var conf = options.nginx.site.string;

        assert.match(conf, new RegExp('ssl_certificate_key '+ options.nginx.outkey));
        assert.match(conf, new RegExp('ssl_certificate '+ options.nginx.outcrt));
      });
    });
  });
});
