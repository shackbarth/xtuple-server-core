var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore');

_.mixin(require('congruence'));

describe('pg.ctl', function () {
  var pg = require('../pg/ctl');

  describe('#lsclusters()', function () {

    it('should correctly parse pristine output', function () {

      var responseTemplate = {
          '(+)': _.isArray,
          count: _.isNumber
        },
        rowTemplate = {
          version: _.isNumber,
          name: _.isString,
          port: _.isNumber,
          status: _.isString,
          owner: _.isString,
          data: _.isString,
          log: _.isString
        },
        header = ['version', 'name', 'port', 'status', 'owner', 'data', 'log'],
        options = { header: header, shift: 1, group: 'name', count: true },
        pg_lsclusters = m(function () {
          /***
            Ver Cluster   Port Status Owner    Data directory                    Log file
            9.1 kelhay    5437 down   postgres /var/lib/postgresql/9.1/kelhay    /var/log/postgresql/postgresql-9.1-kelhay.log
            9.1 main      5432 online postgres /var/lib/postgresql/9.1/main      /var/log/postgresql/postgresql-9.1-main.log
            9.1 mochatest 5439 down   postgres /var/lib/postgresql/9.1/mochatest /var/log/postgresql/postgresql-9.1-mochatest.log
            9.1 test2     5438 down   postgres /var/lib/postgresql/9.1/test2     /var/log/postgresql/postgresql-9.1-test2.log
            9.3 local     5434 online postgres /var/lib/postgresql/9.3/local     /var/log/postgresql/postgresql-9.3-local.log
            9.3 local93   5435 online postgres /var/lib/postgresql/9.3/local93   /var/log/postgresql/postgresql-9.3-local93.log
            9.3 main      5433 online postgres /var/lib/postgresql/9.3/main      /var/log/postgresql/postgresql-9.3-main.log
            9.3 xtuple    5436 online postgres /var/lib/postgresql/9.3/xtuple    /var/log/postgresql/postgresql-9.3-xtuple.log
          ***/
        }),
        parsed = pg._parse(pg_lsclusters, options),
        errors = [ ],
        result = _.test(responseTemplate, parsed, errors);

      assert(result);
      assert(_.all(_.flatten(_.values(_.omit(parsed, 'count'))), function (row) {
        return _.test(rowTemplate, row, errors);
      }));

    });
    it('[sudo] should invoke pg_lsclusters and parse actual output', function () {
      var result = pg.lsclusters();

      assert.isFalse(_.isEmpty(result));
      assert(_.where(_.flatten(_.values(result)), { version: 9.1 }).length > 0);
    });
  });

  describe('#createcluster()', function () {
    it('should correctly parse pristine output', function () {
      var options = {
          keyvalue: true,
          shift: 1
        },
        template = {
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
        parsed = pg._parse(pg_createcluster, options);

      assert(_.test(template, parsed));
    });
    it('[sudo] should create a new cluster', function () {
      var a = pg.lsclusters().count,
        pre = pg.dropcluster({ version: 9.1, name: 'mochatestcreate' }),
        result = pg.createcluster({ version: 9.1, name: 'mochatestcreate' }),
        b = pg.lsclusters().count,
        post = pg.dropcluster({ version: 9.1, name: 'mochatestcreate' });

      assert.equal(b, a + 1);
    });
  });
  describe('#dropcluster', function () {
    it('[sudo] should drop an existing cluster', function () {
      var pre = pg.createcluster({ version: 9.1, name: 'mochatestdrop' }),
        a = pg.lsclusters().count,
        result = pg.dropcluster({ version: 9.1, name: 'mochatestdrop' }),
        b = pg.lsclusters().count,
        post = pg.createcluster({ version: 9.1, name: 'mochatestdrop' });

      assert.equal(b, a - 1);
    });
  });
});

describe('pg.tuner', function () {
  var tuner = require('../pg/tuner');

  describe('#tune()', function () {
    it('should generate a postgres config', function () {
      var cluster = {
          version: 9.1,
          name: 'mochatest',
          port: 5432,
          config: '/etc/postgresql/9.1/mochatest',
          data: '/var/lib/postgresql/9.1/mochatest'
        },
        params = {
          write: false,
          max_clusters: 16
        };

      var postgresql_conf = tuner.tune(cluster, params),
        postgresql_conf2 = tuner.tune(cluster, params);

      assert.equal(postgresql_conf, postgresql_conf2);

      assert.match(postgresql_conf, /shared_buffers = \d+MB/);
      assert.match(postgresql_conf, /temp_buffers = \d+MB/);
      assert.match(postgresql_conf, /work_mem = \d+MB/);
      assert.match(postgresql_conf, /work_mem = \d+MB/);
      assert.match(postgresql_conf, /maintenance_work_mem = \d+MB/);
      assert.match(postgresql_conf, /max_stack_depth = \d+MB/);
      assert.match(postgresql_conf, /effective_cache_size = \d+MB/);
    });
  });
});
