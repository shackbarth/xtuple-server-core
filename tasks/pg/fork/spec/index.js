var lib = require('xtuple-server-lib');
var assert = require('assert');
var _ = require('lodash');
var fs = require('fs');

exports.beforeTask = function (options) {

  describe('pre-conditions', function () {
    it('should expect backup timestamp', function () {
      assert(_.isDate(options.pg.backup.backupMoment));
    });
    it('should expect backup file created from database '+ options.pg.dbname, function () {
      var snapshotFile = lib.util.getForkName(options, false, options.pg.backup.backupMoment);
      assert(fs.existsSync(snapshotFile));
    });
  });

};

exports.afterExecute = function (options) {

  describe('post-conditions', function () {
    it('should have restored database '+ options.pg.dbname, function () {
      var list = lib.pgCli.psql(options, '\\list').split('\n');
      log.info('pg-fork test', list);

    });
  });

};
