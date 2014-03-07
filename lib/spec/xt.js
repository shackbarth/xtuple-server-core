var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore');

describe('xt', function () {

  describe('#serverconfig', function () {
    var configurator = require('../xt/serverconfig');

    it('can parse and generate a new and correct config.js', function () {
      var config = configurator.run({
          pg: {
            adminpw: '12345',
            databases: ['hello', 'world'],
            cluster: {
              port: 5432
            },
          },
          xt: {
            srcdir: '../xtuple'
          }
        });

      assert.match(config.string, /"testDatabase": ""/);
      assert.match(config.string, /"password": "12345"/);
      assert.equal(config.json.datasource.databases.length, 2);
    });
  });
});
