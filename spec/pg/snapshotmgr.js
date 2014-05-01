var assert = require('chai').assert,
  _ = require('lodash'),
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path'),
  lib = require('../../lib'),
  snap = require('../../tasks/pg/snapshotmgr'),
  options = global.options;

describe('cron', function () {
  var lightopts;
  
  beforeEach(function () {
    lightopts = {
      pg: {
        snapshotdir: '/tmp'
      },
      xt: {
        name: 'xtmocha'
      }
    };
  });
  afterEach(function () {
    delete lightopts.pg.snapschedule;
  });

  it('should validate default cron setting (0 0 * * *)', function () {
    lightopts.pg.snapschedule = '0 0 * * *';
    snap.beforeTask(lightopts);
  });
  it('should validate reasonable cron setting (3x per day)', function () {
    lightopts.pg.snapschedule = '0 */4 * * *';
    snap.beforeTask(lightopts);
  });
});

describe.skip('#rotateSnapshot', function () {

  var setupSnapshots = function (n) {
      _.each(_.range(n), function (i) {
        fs.writeFileSync(
          path.resolve(options.pg.snapshotdir, options.xt.name + '_rotatetest_031'+ i + '2014.dir.gz'),
          'hi I am database snapshot file i='+ i +' created by mocha'
        );
        fs.writeFileSync(
          path.resolve(options.pg.snapshotdir, options.xt.name + '_globals_031'+ i + '2014.sql.gz'),
          'hi I am globals snapshot i='+ i +' created by mocha'
        );
      });
    };

  beforeEach(function () {
    exec('rm -rf ' + options.pg.snapshotdir);
    assert.equal(exec('mkdir -p ' + options.pg.snapshotdir).code, 0,
      'Failed to create snapshot directory');
  });

  it('should delete expired snapshots', function () {
    var n = Math.floor(Math.random() * 2) + 7;
    setupSnapshots(n);

    var expired = snap.rotateSnapshot(options),
      extant = fs.readdirSync(options.pg.snapshotdir);

    assert.equal(expired.length, 2 * (n - 7));
    assert.equal(extant.length, 2 * 7);
  });
  it('should do nothing if all snapshots are current', function () {
    var n = Math.floor(Math.random() * 6) + 1;
    setupSnapshots(n);

    var initial = fs.readdirSync(options.pg.snapshotdir),
    expired = snap.rotateSnapshot(options),
    extant = fs.readdirSync(options.pg.snapshotdir);

    assert.equal(expired.length, 0);
    assert.equal(extant.length, 2 * n);
  });
  afterEach(function () {
    exec('rm -rf ' + options.pg.snapshotdir);
  });
});

describe.skip('#parseFilename', function () {
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

describe.skip('#createSnapshot', function () {

  beforeEach(function () {
    exec('mkdir -p '+ options.xt.srcdir);
    exec('rm -rf '+ options.pg.snapshotdir);
    exec('mkdir -p '+ options.pg.snapshotdir);

    pgPhase.snapshotmgr.beforeTask(options);
  });

  it('should create a snapshot of all databases in the cluster', function () {
    assert(snap.createSnapshot(options));

    // TODO check fs with readdirSync
  });

  after(function () {
    _.each([
      'rm -rf '+ options.pg.snapshotdir,
      'rm -rf '+ options.xt.database.list[0].config,
      'rm -rf '+ options.xt.database.list[0].data,
    ], exec);
  });
});
