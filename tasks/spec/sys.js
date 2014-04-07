var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore'),
  fs = require('fs'),
  pgcli = require('../../lib/pg-cli'),
  exec = require('execSync').exec;

_.mixin(require('congruence'));

describe('phase: sys', function () {
  var sysPhase = require('../sys'),
    pgPhase = require('../pg'),
    xtPhase = require('../xt'),
    nginxPhase = require('../nginx'),
    options;

  beforeEach(function () {
    options = global.options;
  });

  describe('task: policy', function () {

    describe('#createUsers', function () {

      beforeEach(function () {
        xtPhase.serverconfig.beforeInstall(options);
        sysPhase.policy.beforeTask(options);
        sysPhase.policy.createUsers(options);
      });
      afterEach(function () {
        exec('deluser '+ options.xt.name);
        exec('rm -f /etc/sudoers.d/*'+ options.xt.name + '*');
        exec('rm -rf /usr/local/'+ options.xt.name);
      });

      it('should write valid sudoers files', function () {
        assert(exec('visudo -c').code === 0);
      });
      it('should create user account', function () {
        assert.equal(exec('id '+ options.xt.name).code, 0);
      });
      it('should be able to control my personal pg cluster', function () {
        pgPhase.cluster.beforeInstall(options);
        pgPhase.config.beforeTask(options);
        pgPhase.config.doTask(options);
        pgPhase.cluster.doTask(options);

        nginxPhase.ssl.beforeTask(options);
        nginxPhase.ssl.doTask(options);

        pgPhase.hba.beforeTask(options);
        pgPhase.hba.doTask(options);

        pgPhase.tuner.doTask(options);

        pgcli.ctlcluster({ action: 'restart', version: options.pg.version, name: options.xt.name });

        exec('sudo -u {xt.name} pg_ctlcluster {pg.version} {xt.name} stop'.format(options));
        var result = exec('sudo -u {xt.name} pg_ctlcluster {pg.version} {xt.name} start'.format(options));

        xtPhase.database.doTask(options);

        assert.equal(result.code, 0, JSON.stringify(result));
        pgcli.dropcluster(options.pg.cluster);
      });
    });
  });
});
