var assert = require('chai').assert;

describe('pg.tuner', function () {
  var tuner = require('../pg/tuner');

  it('#tune()', function () {
    var cluster = {
        version: 9.1,
        name: 'test',
        port: 5432,
        config: '/etc/postgresql/9.1/kelhay',
        data: '/var/lib/postgresql/9.1/kelhay'
      },
      params = {
      };

    var postgresql_conf = tuner.tune(cluster, params);

    //assert.match(postgresql_conf, /data_directory = /'data_directory = '/var/lib/postgresql/9.1/kelhay'/);
    //assert.match(postgresql_conf, 'hba_file = \'\/etc\/postgresql\/\w+\/\w+\/pg_hba.conf');

    assert.match(postgresql_conf, /shared_buffers = \d+MB/);
    assert.match(postgresql_conf, /temp_buffers = \d+MB/);
    assert.match(postgresql_conf, /work_mem = \d+MB/);
    assert.match(postgresql_conf, /work_mem = \d+MB/);
    assert.match(postgresql_conf, /maintenance_work_mem = \d+MB/);
    assert.match(postgresql_conf, /max_stack_depth = \d+MB/);
    assert.match(postgresql_conf, /effective_cache_size = \d+MB/);
  });
});
