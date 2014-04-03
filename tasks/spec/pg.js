var assert = require('chai').assert,
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  m = require('mstring'),
  moment = require('moment'),
  _ = require('underscore'),
  nginx = require('../nginx'),
  pgcli = require('../../lib/pg-cli');

_.mixin(require('congruence'));

describe('phase: pg', function () {
  var pgPhase = require('../pg'),
    options = global.options;

  it('should be sane', function () {
    assert(pgPhase);
    assert(pgPhase.config);
    assert(pgPhase.tuner);
    assert(pgPhase.hba);
    assert(pgPhase.snapshotmgr);
    assert(pgPhase.cluster);
  });

  describe('task: tuner', function () {
    describe('#run', function () {
      it('should generate a correct postgres config', function () {
        var postgresql_conf = pgPhase.tuner.run(options).string;

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

  describe('task: hba', function () {
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
        pgPhase.hba.beforeTask(options);
        var hba_conf = pgPhase.hba.run(options);

        assert.match(hba_conf.string, /all \s+ all \s+ 10\.0\.0\.0\/8 \s+ md5/);
        assert.match(hba_conf.string, /all \s+ all \s+ 172\.16\.0\.0\/12 \s+ md5/);
        assert.match(hba_conf.string, /all \s+ all \s+ 192\.168\.0\.0\/16 \s+ md5/);
      });
    });
  });

  describe('task: snapshotmgr', function () {
    var snap = pgPhase.snapshotmgr,
      snapshot_path;

    beforeEach(function () {
      pgPhase.snapshotmgr.beforeTask(options);
      snapshot_path = snap.getSnapshotRoot(options.xt.version, options.xt.name);
    });

    describe('cli', function () {
      it.skip('should start a service when invoked from the command line', function () {

      });
    });

    describe('#rotateSnapshot', function () {
      /**
       * Create some not even remotely believable snapshots only for the
       * purpose of testing whether we can correctly count and rotate them.
       */
      var setupSnapshots = function (n) {
          _.each(_.range(n), function (i) {
            fs.writeFileSync(
              path.resolve(snapshot_path, options.xt.name + '_rotatetest_031'+ i + '2014.dir.gz'),
              'hi I am database snapshot file i='+ i +' created by mocha'
            );
            fs.writeFileSync(
              path.resolve(snapshot_path, options.xt.name + '_globals_031'+ i + '2014.sql.gz'),
              'hi I am globals snapshot i='+ i +' created by mocha'
            );
          });
        };

      beforeEach(function () {
        exec('rm -rf ' + snapshot_path);
        assert.equal(exec('mkdir -p ' + snapshot_path).code, 0,
          'Failed to create snapshot directory');
      });

      it('should delete expired snapshots', function () {
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

        var initial = fs.readdirSync(snapshot_path),
        expired = snap.rotateSnapshot(options),
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
        assert.equal(parsed.db.dbname, 'dogfood');
        assert.equal(parsed.db.ts, moment('03142014', 'MMDDYYYY').toDate().valueOf());
        assert.equal(parsed.globals.dbname, 'globals');
      });
    });

    describe('#createSnapshot', function () {
      var xt = require('../xt');

      beforeEach(function () {
        exec('mkdir -p '+ options.xt.appdir);
        exec('rm -rf '+ snapshot_path);
        exec('mkdir -p '+ snapshot_path);
        nginx.ssl.generate('/srv/ssl/', 'localhost' + options.xt.name);
        pgPhase.snapshotmgr.beforeTask(options);

        pgPhase.tuner.run(options);
        pgPhase.hba.beforeTask(options);
        pgPhase.hba.run(options);
        pgPhase.cluster.initCluster(options);

        options.xt.database = xt.database.run(options);
        options.pg.snapshot = snap.createSnapshot(options);
      });

      it('should create a snapshot of all databases in the cluster', function () {
        assert.lengthOf(options.pg.snapshot, options.xt.database.list.length + 1);
        assert.notInclude(_.pluck(options.pg.snapshot, 'code'), 1);
      });

      after(function () {
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
