var assert = require('chai').assert,
  _ = require('underscore'),
  exec = require('execSync').exec,
  lib = require('../../lib'),
  options = global.options;

it('should generate correct values', function () {
  var postgresql_conf = options.pg.tuner.string;

  assert.match(postgresql_conf, /shared_buffers = \d+MB/);
  assert.match(postgresql_conf, /temp_buffers = \d+MB/);
  assert.match(postgresql_conf, /work_mem = \d+MB/);
  assert.match(postgresql_conf, /work_mem = \d+MB/);
  assert.match(postgresql_conf, /maintenance_work_mem = \d+MB/);
  assert.match(postgresql_conf, /max_stack_depth = \d+MB/);
  assert.match(postgresql_conf, /effective_cache_size = \d+MB/);
});
it('should generate a verifiably-correct postgresql.conf', function () {
  var restart = lib.pgCli.ctlcluster(_.extend({ action: 'restart' }, options.pg.cluster));
  assert.equal(restart.code, 0);
});

