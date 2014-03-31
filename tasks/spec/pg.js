var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  m = require('mstring'),
  moment = require('moment'),
  _ = require('underscore'),
  pgcli = require('../../lib/pg-cli'),
  pghba = require('../pg/hba');

_.mixin(require('congruence'));

describe('phase: pg', function () {

  describe('task: tuner', function () {
    var $k = Math.round((Math.random() * 2e16)).toString(16),
      tuner = require('../pg/tuner'),
      testcluster = {
        version: 9.1,
        name: $k
      };

    before(function () {
      pgcli.createcluster(testcluster);
      pgcli.ctlcluster(_.extend({ action: 'start' }, testcluster));
    });

    describe('#run', function () {
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
        pgcli.dropcluster(testcluster);
      });
    });

    describe('task: hba', function () {
      var $k = Math.round((Math.random() * 2e16)).toString(16),
        testcluster = {
          version: 9.1,
          name: $k
        };

      before(function () {
        pgcli.createcluster(testcluster);
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
            parsed = pgcli.parse(hba_conf, 'pg_hba');

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
        pgcli.dropcluster(testcluster);
      });
    });
  });

  describe('task: snapshotmgr', function () {
    var snap = require('../pg/snapshotmgr');

    describe('#rotateSnapshot', function () {
      var $k = Math.round((Math.random() * 2e16)).toString(16),
        snapshot_path = snap.getSnapshotRoot('0.0.0', $k),
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

        var expired = snap.rotateSnapshot(options),
          extant = fs.readdirSync(snapshot_path);

        assert.equal(expired.length, 2 * (n - 7));
        assert.equal(extant.length, 2 * 7);
      });
      it('should do nothing if all snapshots are current', function () {
        var n = Math.floor(Math.random() * 6) + 1;
        
        setupSnapshots(n);

        var initial = fs.readdirSync(snapshot_path);

        var expired = snap.rotateSnapshot(options),
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
            globals: snap.parseFilename(snapshot_globals),
            db: snap.parseFilename(snapshot_db)
          };

        assert.equal(parsed.db.name, 'xtuple');
        assert.equal(parsed.db.database, 'dogfood');
        assert.equal(parsed.db.ts, moment('03142014', 'MMDDYYYY').toDate().valueOf());
        assert.equal(parsed.globals.database, 'globals');
      });
    });

    describe('#createSnapshot', function () {
      var xt = require('../xt'),
        $k = Math.round((Math.random() * 2e16)).toString(16),
        testcluster = {
          version: 9.1,
          name: $k
        },
        options = {
          xt: {
            name: $k,
            version: '1.8.1',
            appdir: path.resolve('/tmp/', 'xtmocha', '1.8.1', $k),
            adminpw: '123',
            setupdemos: true
          },
          pg: {
            version: 9.1,
          }
        },
        snapshot_path = snap.getSnapshotRoot(options.pg.version, $k);

      before(function () {
        exec('mkdir -p '+ options.xt.appdir);
        options.pg.cluster = pgcli.createcluster(testcluster);
        pgcli.ctlcluster({
          version: options.pg.version,
          name: options.xt.name,
          action: 'start'
        });

        options.xt.database = xt.database.run(options);
        snap.prelude(options);
        options.pg.snapshot = snap.createSnapshot(options);
      });

      it('should create a snapshot of all databases in the specified cluster', function () {
        assert.lengthOf(options.pg.snapshot, options.xt.database.list.length + 1);
        assert.notInclude(_.pluck(options.pg.snapshot, 'code'), 1);
      });
      it('should save all users and roles in the specified cluster', function () {

      });

      after(function () {
        pgcli.dropcluster(testcluster);
        _.each([
          'rm -rf '+ options.xt.appdir,
          'rm -rf '+ snapshot_path,
          'rm -rf '+ options.xt.database.list[0].config,
          'rm -rf '+ options.xt.database.list[0].data,
        ], exec);
      });
    });
  });
});
