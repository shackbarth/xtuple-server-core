var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore');

describe('xt', function () {

  describe('#server-config', function () {
    var configurator = require('../xt/server-config');

    it('can parse and generate a new and correct config.js', function () {
      var config = configurator.run({
        pg: {
          dbadminpw: '12345',
          databases: ['hello', 'world'],
          cluster: {
            port: 5432
          },
          //srcdir: '../../
        }
      });

      console.log(config);
    });
  });

});
