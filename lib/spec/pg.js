var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  m = require('mstring'),
  moment = require('moment'),
  _ = require('underscore');

_.mixin(require('congruence'));

describe('pg', function () {

  describe('.ctl', function () {
    var pgctl = require('../pg/ctl');

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
    describe('#createcluster()', function () {
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

  describe('tuner', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16),
      pgctl = require('../pg/ctl'),
      tuner = require('../pg/tuner'),
      testcluster = {
        version: 9.1,
        name: $k
      };

    before(function () {
      pgctl.createcluster(testcluster);
      pgctl.ctlcluster(_.extend({ action: 'start' }, testcluster));
    });

    describe('#run()', function () {
      it('should generate a postgres config', function () {
        var options = {
          pg: {
            version: 9.1,
            name: $k,
            cluster: {
              version: 9.1,
              name: $k,
              port: 5432,
              config: '/etc/postgresql/9.1/' + $k,
              data: '/var/lib/postgresql/9.1/' + $k
            },
            config: {
              slots: 2,
              shared_buffers: 384,
              temp_buffers: 16,
              max_connections: 10,
              work_mem: 1,
              maintenance_work_mem: 16,
              locale: 'en_US.UTF-8'
            }
          }
        };

        var postgresql_conf = tuner.run(options).string;

        assert.match(postgresql_conf, /shared_buffers = \d+MB/);
        assert.match(postgresql_conf, /temp_buffers = \d+MB/);
        assert.match(postgresql_conf, /work_mem = \d+MB/);
        assert.match(postgresql_conf, /work_mem = \d+MB/);
        assert.match(postgresql_conf, /maintenance_work_mem = \d+MB/);
        assert.match(postgresql_conf, /max_stack_depth = \d+MB/);
        assert.match(postgresql_conf, /effective_cache_size = \d+MB/);
      });
      after(function () {
        pgctl.dropcluster(testcluster);
      });
    });

    describe('hba', function () {
      var pgctl = require('../pg/ctl'),
        pghba = require('../pg/hba'),
        $k = Math.round((Math.random() * 2e16)).toString(16),
        testcluster = {
          version: 9.1,
          name: $k
        };

      before(function () {
        var $k = Math.round((Math.random() * 2e16)).toString(16);
        pgctl.createcluster(testcluster);
      });

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
          assert.equal(parsed[0].user, 'postgres');
        });
        it('should generate correct pg_hba.conf', function () {
          var hba_conf = pghba.run({
            dry: true,
            pg: {
              version: 9.1,
              name: $k,
              port: 5432,
              config: '/etc/postgresql/9.1/' + $k,
              data: '/var/lib/postgresql/9.1/' + $k
            }
          }).string;

          assert.match(hba_conf, /xtuple.com/);
          assert.match(hba_conf, /local \s+ all \s+ all \s+ peer/);
          assert.match(hba_conf, /all \s+ all \s+ 10\.0\.0\.0\/8 \s+ md5/);
          assert.match(hba_conf, /all \s+ all \s+ 172\.16\.0\.0\/12 \s+ md5/);
          assert.match(hba_conf, /all \s+ all \s+ 192\.168\.0\.0\/16 \s+ md5/);
          assert.match(hba_conf, /all \s+ all \s+ .xtuple.com \s+ md5/);
        });
      });
      after(function () {
        pgctl.dropcluster(testcluster);
      });
    });
  });

  describe('backupservice', function () {
    var bs = require('../pg/backupservice');

    describe('#run', function () {
    });

    describe('#rotateSnapshot', function () {
      var $k = Math.round((Math.random() * 2e16)).toString(16),
        snapshot_path = bs.getBackupPath('0.0.0', $k),
        options = {
          xt: {
            name: $k,
            version: '0.0.0',
          },
          pg: {
            snapshotcount: 7
          }
        },
        setupSnapshots = function (n) {
          _.each(_.range(n), function (i) {
            fs.writeFileSync(
              path.resolve(snapshot_path, $k + '_rotatetest_031'+ i + '2014.dir.gz'),
              'hi I am backup file i='+ i +' created by mocha'
            );
            fs.writeFileSync(
              path.resolve(snapshot_path, $k + '_globals_031'+ i + '2014.sql.gz'),
              'hi I am backup file i='+ i +' created by mocha'
            );
          });
        };

      beforeEach(function () {
        exec('rm -rf ' + snapshot_path);
        assert.equal(exec('mkdir -p ' + snapshot_path).code, 0,
          'Failed to create snapshot directory');
      });

      it('should delete expired snapshots', function () {
        // working in 'more' randomness would require a lot more string building
        // logic for the filenames; this will do
        var n = Math.floor(Math.random() * 2) + 7;
        setupSnapshots(n);

        var expired = bs.rotateSnapshot(options),
          extant = fs.readdirSync(snapshot_path);

        assert.equal(expired.length, 2 * (n - 7));
        assert.equal(extant.length, 2 * 7);
      });
      it('should do nothing if all snapshots are current', function () {
        var n = Math.floor(Math.random() * 6) + 1;
        
        setupSnapshots(n);

        var initial = fs.readdirSync(snapshot_path);

        var expired = bs.rotateSnapshot(options),
          extant = fs.readdirSync(snapshot_path);

        assert.equal(expired.length, 0);
        assert.equal(extant.length, 2 * n);
      });
      afterEach(function () {
        exec('rm -rf ' + snapshot_path);
      });
    });

    describe('#parseFilename', function () {

      it('should parse a correct pg snapshot filename', function () {

        var snapshot_globals = 'xtuple_globals_03142014.sql.gz',
          snapshot_db = 'xtuple_dogfood_03142014.dir.gz',
          parsed = {
            globals: bs.parseFilename(snapshot_globals),
            db: bs.parseFilename(snapshot_db)
          };

        assert.equal(parsed.db.name, 'xtuple');
        assert.equal(parsed.db.database, 'dogfood');
        assert.equal(parsed.db.ts, moment('03142014', 'MMDDYYYY').toDate().valueOf());
        assert.equal(parsed.globals.database, 'globals');
      });
    });
  });

});
