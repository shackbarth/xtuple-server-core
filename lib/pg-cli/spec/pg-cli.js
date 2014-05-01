var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  m = require('mstring'),
  moment = require('moment'),
  _ = require('lodash');

_.mixin(require('congruence'));

describe('pg-cli', function () {
  var pgctl = require('../');

  describe('#parse(..., "pg_lsclusters")', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16);

    it('should correctly parse pristine output', function () {
      var rowTemplate = {
          version: _.isNumber,
          name: _.isString,
          port: _.isNumber,
          status: _.isString,
          owner: _.isString,
          data: _.isString,
          log: _.isString
        },
        pg_lsclusters = m(function () {
          /***
            Ver Cluster   Port Status Owner    Data directory                    Log file
            9.1 main      5432 online postgres /var/lib/postgresql/9.1/main      /var/log/postgresql/postgresql-9.1-main.log
            9.1 mochatest 5439 down   postgres /var/lib/postgresql/9.1/mochatest /var/log/postgresql/postgresql-9.1-mochatest.log
            9.1 test2     5438 down   postgres /var/lib/postgresql/9.1/test2     /var/log/postgresql/postgresql-9.1-test2.log
            9.3 local     5434 online postgres /var/lib/postgresql/9.3/local     /var/log/postgresql/postgresql-9.3-local.log
            9.3 local93   5435 online postgres /var/lib/postgresql/9.3/local93   /var/log/postgresql/postgresql-9.3-local93.log
            9.3 main      5433 online postgres /var/lib/postgresql/9.3/main      /var/log/postgresql/postgresql-9.3-main.log
            9.3 xtuple    5436 online postgres /var/lib/postgresql/9.3/xtuple    /var/log/postgresql/postgresql-9.3-xtuple.log
          ***/
        }),
        parsed = pgctl.parse(pg_lsclusters, 'pg_lsclusters'),
        errors = [ ];

      assert(_.all(parsed), function (row) {
        return _.test(rowTemplate, row, errors);
      });
    });
  });
  describe('#lsclusters()', function () {
    it('should invoke pg_lsclusters and parse actual output', function () {
      var result = pgctl.lsclusters();

      assert.isFalse(_.isEmpty(result));
      assert(_.where(result, { version: 9.1 }).length > 0);
    });
  });

  describe('#parse(..., "pg_createcluster")', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16);

    it('should correctly parse pristine output', function () {
      var template = {
          config: _.isString,
          data: _.isString,
          locale: _.isString,
          port: _.isString
        },
        pg_createcluster = m(function () {
          /***
            Creating new cluster 9.3/faketest ...
              config /etc/postgresql/9.3/faketest
              data   /var/lib/postgresql/9.3/faketest
              locale en_US.UTF-8
              port   5442
          ***/
        }),
        parsed = pgctl.parse(pg_createcluster, 'pg_createcluster');

      assert(_.test(template, parsed));
    });
  });
  describe('#createcluster', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16),
      testcluster = {
        version: 9.1,
        name: $k
      };

    it('[sudo] should create a new cluster', function () {
      var a = pgctl.lsclusters().length,
        result = pgctl.createcluster(testcluster),
        b = pgctl.lsclusters().length;

      assert.equal(b, a + 1);
    });
    after(function () {
      pgctl.dropcluster(testcluster);
    });
  });
  describe('#dropcluster', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16),
      testcluster = {
        version: 9.1,
        name: $k
      };

    beforeEach(function () {
      pgctl.createcluster(testcluster);
    });
    it('[sudo] should drop an existing cluster', function () {
      var a = pgctl.lsclusters().length,
        result = pgctl.dropcluster(testcluster),
        b = pgctl.lsclusters().length;

      assert.equal(b, a - 1);
    });
  });
});
