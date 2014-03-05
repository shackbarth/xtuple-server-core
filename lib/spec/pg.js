var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore');

_.mixin(require('congruence'));

describe('pg', function () {

  describe('.ctl', function () {
    var pgctl = require('../pg/ctl');

    describe('#parse(..., "pg_lsclusters")', function () {
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
    describe('#createcluster()', function () {
      beforeEach(function () {
        var cluster = _.findWhere(pgctl.lsclusters(), { name: 'mochatestcreate' });
        if (cluster) {
          pgctl.dropcluster({ version: 9.1, name: 'mochatestcreate' });
        }
      });
      it('[sudo] should create a new cluster', function () {
        var a = pgctl.lsclusters().count,
          result = pgctl.createcluster({ version: 9.1, name: 'mochatestcreate' }),
          b = pgctl.lsclusters().count;

        assert.equal(b, a + 1);
      });
      afterEach(function () {
        var cluster = _.findWhere(pgctl.lsclusters(), { name: 'mochatestcreate' });
        if (cluster) {
          pgctl.dropcluster({ version: 9.1, name: 'mochatestcreate' });
        }
      });
    });
    describe('#dropcluster', function () {
      beforeEach(function () {
        pgctl.createcluster({ version: 9.1, name: 'mochatestdrop' });
      });
      it('[sudo] should drop an existing cluster', function () {
        var a = pgctl.lsclusters().count,
          result = pgctl.dropcluster({ version: 9.1, name: 'mochatestdrop' }),
          b = pgctl.lsclusters().count;

        assert.equal(b, a - 1);
      });
      afterEach(function () {
        pgctl.dropcluster({ version: 9.1, name: 'mochatestdrop' });
      });
    });
  });

  describe('tuner', function () {
    var tuner = require('../pg/tuner');

    describe('#run()', function () {
      it('should generate a postgres config', function () {
        var cluster = {
            version: 9.1,
            name: 'mochatest',
            port: 5432,
            config: '/etc/postgresql/9.1/mochatest',
            data: '/var/lib/postgresql/9.1/mochatest'
          },
          config = {
            dry: true,
            slots: 2,
            ram: 384,
            temp_buffers: 16,
            work_mem: 1,
            maintenance_work_mem: 16,
            locale: 'en_US.UTF-8'
          },
          env = {
            stacklimit: 8,
            phi: (Math.sqrt(5) + 1) / 2
          };

        var postgresql_conf = tuner.run({
          cluster: cluster,
          config: config,
          env: env
        }).string;

        assert.match(postgresql_conf, /shared_buffers = \d+MB/);
        assert.match(postgresql_conf, /temp_buffers = \d+MB/);
        assert.match(postgresql_conf, /work_mem = \d+MB/);
        assert.match(postgresql_conf, /work_mem = \d+MB/);
        assert.match(postgresql_conf, /maintenance_work_mem = \d+MB/);
        assert.match(postgresql_conf, /max_stack_depth = \d+MB/);
        assert.match(postgresql_conf, /effective_cache_size = \d+MB/);
      });
    });

    describe('pg.hba', function () {
      var pgctl = require('../pg/ctl'),
        pghba = require('../pg/hba');

      describe('#run()', function () {
        it('can parse a pristine pg_hba', function () {
          var hba_conf = m(function () {
            /***
              local   all             postgres                                peer
              local   all             all                                     peer
              host    all             all             127.0.0.1/32            trust
      
              host    all             all             10/8                    md5
              host    all             all             172.16/12               md5
              host    all             all             192.168/16              md5
      
              host    all             all             .xtuple.com             md5
              host    all             all             ::1/128                 md5
            ***/
            }),
            parsed = pgctl.parse(hba_conf, 'pg_hba');

          assert(_.findWhere(parsed, { address: '.xtuple.com' }));
        });
        it('should generate correct pg_hba.conf', function () {
          var hba_conf = pghba.run({
            dry: true,
            pg: {
              version: 9.1,
              name: 'mochahbatest',
              port: 5432,
              config: '/etc/postgresql/9.1/mochahbatest',
              data: '/var/lib/postgresql/9.1/mochahbatest'
            }
          }).string;

          assert.match(hba_conf, /xtuple.com/);
          assert.match(hba_conf, /local \s+ all \s+ postgres \s+ peer/);
          assert.match(hba_conf, /host \s+ all \s+ all \s+ 10\/8 \s+ md5/);
          assert.match(hba_conf, /host \s+ all \s+ all \s+ 172\.16\/12 \s+ md5/);
          assert.match(hba_conf, /host \s+ all \s+ all \s+ 192\.168\/16 \s+ md5/);
          assert.match(hba_conf, /host \s+ all \s+ all \s+ .xtuple.com \s+ md5/);
        });
      });
    });

    describe('pg.xgres', function () {
      var pg = require('../pg/config');

      describe('#configure', function () {

        it.skip('should read and aggregate current slot configs', function () {
          var info = pg.configure('production', {
            name: 'mochatestconfigure'
          });
        });

      });

      describe('#run()', function () {
        it('[sudo] should create a new xgres instance', function () {
          var result = pg.run({
            version: 9.1,
            name: 'mochatestcreator',
            mode: 'demo',
            slots: 1
          });
        });
      });
    });
  });
});
