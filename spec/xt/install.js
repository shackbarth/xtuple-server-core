var assert = require('chai').assert,
  lib = require('xtuple-server-lib'),
  _ = require('lodash'),
  fs = require('fs'),
  exec = require('execSync').exec,
  options = global.options;

describe('#getRepositoryList', function () {

  afterEach(function () {
    options.xt.edition = 'core';
  });

  it('should clone only public repos if installing a free edition', function () {
    var repoList = lib.util.getRepositoryList(options);

    assert.include(repoList, 'xtuple');
    assert.include(repoList, 'xtuple-extensions');
    assert.notInclude(repoList, 'private-extensions');
  });
  it('should clone all repos if installing a premium edition', function () {
    options.xt.edition = 'manufacturing';
    var repoList = lib.util.getRepositoryList(options);

    assert.include(repoList, 'xtuple');
    assert.include(repoList, 'xtuple-extensions');
    assert.include(repoList, 'private-extensions');

    options.xt.edition = 'distribution';
    repoList = lib.util.getRepositoryList(options);

    assert.include(repoList, 'xtuple');
    assert.include(repoList, 'xtuple-extensions');
    assert.include(repoList, 'private-extensions');

    options.xt.edition = 'enterprise';
    repoList = lib.util.getRepositoryList(options);

    assert.include(repoList, 'xtuple');
    assert.include(repoList, 'xtuple-extensions');
    assert.include(repoList, 'private-extensions');
  });
  it('should clone and npm install public repos without prompting for password', function () {
    var xtupleRepo = fs.existsSync(options.xt.srcdir, 'xtuple'),
      extensionsRepo = fs.existsSync(options.xt.srcdir, 'xtuple-extensions');

    assert.isTrue(xtupleRepo);
    assert.isTrue(extensionsRepo);
  });
});
