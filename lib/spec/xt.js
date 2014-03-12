var assert = require('chai').assert,
  exec = require('execSync').exec,
  m = require('mstring'),
  _ = require('underscore');

describe('xt', function () {

  describe('#testconfig', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16);
    var testconfig = require('../xt/testconfig');

    before(function () {
      exec('mkdir -p __appdir ' + $k);
      exec('mkdir -p __log ' + $k);
    });

    it('can parse and generate a correct login_data.js', function () {
      var options = {
        appdir: '__appdir' + $k,
        adminpw: '123'
      };

    });
    after(function () {
      exec('rm -rf *{testkey}'.format({ testkey: $k }));
    });
  });

  describe('#serverconfig', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16);
    var serverconfig = require('../xt/serverconfig');

    before(function () {
      exec('mkdir -p __config ' + $k);
      exec('mkdir -p __log ' + $k);
    });

    it('can parse and generate a correct config.js', function () {
      var options = {
          pg: {
            name: $k,
            databases: ['hello', 'world'],
            cluster: {
              port: 5432
            },
          },
          nginx: {
            domain: 'localhost'
          },
          xt: {
            adminpw: '12345',
            appdir: '../xtuple',
            configdir: '__config' + $k,
            logdir: '__log' + $k,
            
            database: {
              list: [{
                flavor: 'mochatest'
              }]
            }
          }
        },
        result = serverconfig.run(options);

      assert.match(result.string, /"testDatabase": ""/);
      assert.match(result.string, /"password": "12345"/);
      assert.equal(result.json.datasource.databases.length, 1);
    });

    after(function () {
      exec('rm -rf *{testkey}'.format({ testkey: $k }));
    });
  });
});
