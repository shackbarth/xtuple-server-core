var assert = require('assert'),
  _ = require('lodash'),
  lib = require('xtuple-server-lib'),
  util = require('util'),
  fs = require('fs');

exports.afterTask = function (options) {
  it('should restore database '+ options.pg.dbname, function () {
    log.info('pg-restore test', options.pg.infile);

    var list = lib.pgCli.psql(options, '\\list', true).split('\n');
    log.info('pg-restore test', list);
  });
};

