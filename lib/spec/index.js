var assert = require('chai').assert,
  exec = require('execSync').exec,
  _ = require('lodash'),
  lib = require('../'),
  npm = require('npm'),
  path = require('path'),
  fs = require('fs'),
  planner = lib.planner;

describe('planner', function () {
  describe('#execute', function () {
    it('should return resolved promise', function (done) {
      planner.execute({ }, { planName: 'promise-test' })
        .then(function () {
          done();
        })
        .fail(function (e) {
          assert.fail(e);
        });
    });
  });
});
