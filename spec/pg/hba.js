var assert = require('chai').assert,
  _ = require('lodash'),
  exec = require('execSync').exec,
  lib = require('xtuple-server-lib'),
  options = global.options;

it('can parse a pristine pg_hba', function () {
  var hba_conf = [
      'local   all             postgres                                peer',
      'local   all             all                                     peer',
      'host    all             all             127.0.0.1/32            trust',

      'host    all             all             10/8                    md5',
      'host    all             all             172.16/12               md5',
      'host    all             all             192.168/16              md5',

      'host    all             all             .xtuple.com             md5',
      'host    all             all             ::1/128                 md5'
    ].join('\n'),
    parsed = lib.pgCli.parse(hba_conf, 'pg_hba');

  assert(_.findWhere(parsed, { address: '.xtuple.com' }));
  assert.equal(parsed[0].user, 'postgres');
});
it('should generate correct pg_hba.conf', function () {
  assert.match(options.pg.hba.string, /all \s+ all \s+ 10\.0\.0\.0\/8 \s+ md5/);
  assert.match(options.pg.hba.string, /all \s+ all \s+ 172\.16\.0\.0\/12 \s+ md5/);
  assert.match(options.pg.hba.string, /all \s+ all \s+ 192\.168\.0\.0\/16 \s+ md5/);
});

