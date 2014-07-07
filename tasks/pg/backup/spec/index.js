var assert = require('assert'),
  _ = require('lodash'),
  lib = require('xtuple-server-lib'),
  util = require('util'),
  fs = require('fs');

exports.afterTask = function (options) {
  it('should back up database '+ options.pg.dbname, function () {
    var snapshotstat = fs.statSync(options.pg.backup.backupFile);
    var globalstat = fs.statSync(options.pg.backup.globalsFile);

    log.verbose('pg-backup snapshotfile path', options.pg.backup.backupFile);
    assert(snapshotstat.isDirectory());
    assert(snapshotstat.size > 0);

    log.verbose('pg-backup globalsfile path', options.pg.backup.globalsFile);
    assert(globalstat.isFile());
    assert(globalstat.size > 0);
  });
};
