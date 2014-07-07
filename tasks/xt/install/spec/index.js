var assert = require('assert'),
  lib = require('xtuple-server-lib'),
  _ = require('lodash'),
  fs = require('fs');

exports.afterExecute = function (_options) {
  var options = { };

  describe('#getRepositoryList', function () {

    beforeEach(function () {
      options = JSON.parse(JSON.stringify(_options));
    });

    it('should clone only public repos if installing a free edition', function () {
      options.xt.edition = 'core';
      var repoList = lib.util.getRepositoryList(options);

      assert.ok(_.contains(repoList, 'xtuple'));
      assert.ok(_.contains(repoList, 'xtuple-extensions'));
      assert.ok(!_.contains(repoList, 'private-extensions'));
    });
    it('should clone all repos if installing a premium edition', function () {
      options.xt.edition = 'manufacturing';
      var repoList = lib.util.getRepositoryList(options);

      assert.ok(_.contains(repoList, 'xtuple'));
      assert.ok(_.contains(repoList, 'xtuple-extensions'));
      assert.ok(_.contains(repoList, 'private-extensions'));

      options.xt.edition = 'distribution';
      repoList = lib.util.getRepositoryList(options);

      assert.ok(_.contains(repoList, 'xtuple'));
      assert.ok(_.contains(repoList, 'xtuple-extensions'));
      assert.ok(_.contains(repoList, 'private-extensions'));

      options.xt.edition = 'enterprise';
      repoList = lib.util.getRepositoryList(options);

      assert.ok(_.contains(repoList, 'xtuple'));
      assert.ok(_.contains(repoList, 'xtuple-extensions'));
      assert.ok(_.contains(repoList, 'private-extensions'));
    });
    it('should clone and npm install public repos without prompting for password', function () {
      var xtupleRepo = fs.existsSync(options.xt.userdist, 'xtuple'),
        extensionsRepo = fs.existsSync(options.xt.userdist, 'xtuple-extensions');

      assert.ok(xtupleRepo);
      assert.ok(extensionsRepo);
    });
  });
};
