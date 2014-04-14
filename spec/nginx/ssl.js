var assert = require('chai').assert,
  _ = require('underscore'),
  fs = require('fs'),
  path = require('path'),
  exec = require('execSync').exec,
  nginxModule = require('../../tasks/nginx'),
  options = global.options;

describe('#verifyCertificate', function () {
  it('should verify a legit cert', function () {
    assert(nginxModule.ssl.verifyCertificate(options));
  });
  it('should reject a non-existent .crt', function () {
    assert.throws(function () {
        nginxModule.ssl.verifyCertificate({
          nginx: {
            outcrt: 'akjdakjdn',
            outkey: options.nginx.outcrt
          }
        });
      }, Error);
  });
  it('should reject a non-existent .key', function () {
    assert.throws(function () {
        nginxModule.ssl.verifyCertificate({
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
      nginxModule.ssl.verifyCertificate(options);
    }, Error, /x509 verify/);

  });
  it('should reject wrong private key', function () {
    nginxModule.ssl.generate(options);
    assert.throws(function () {
        nginxModule.ssl.verifyCertificate({
          nginx: {
            outcrt: options.nginx.outcrt,
            outkey: path.resolve(__filename)
          }
        });
      }, Error, /moduli inconsistent/);

  });
});

describe.skip('#createBundle', function () {
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
    assert(nginxModule.ssl.createBundle(options), 'createBundle did not return true');
  });
  it('should verify a legit bundle', function () {
    assert(nginxModule.ssl.verifyCertificate(options), 'verifyCertificate did not return true');
  });
});
