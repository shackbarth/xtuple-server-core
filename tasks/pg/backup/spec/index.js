var assert = require('assert'),
  _ = require('lodash'),
  lib = require('xtuple-server-lib'),
  util = require('util'),
  fs = require('fs');

exports.afterTask = function (options) {
  it('should back up database '+ options.pg.dbname, function () {
    var snapshotfile = lib.util.getSnapshotPath(options, false);
    var globalsfile = lib.util.getSnapshotPath(options, true);
    var snapshotstat = fs.statSync(snapshotfile);
    var globalstat = fs.statSync(globalsfile);

    log.verbose('pg-backup snapshotfile path', snapshotfile);
    assert(snapshotstat.isDirectory());
    assert(snapshotstat.size > 0);

    log.verbose('pg-backup globalsfile path', globalsfile);
    assert(globalstat.isFile());
    assert(globalstat.size > 0);
  });
};
