var assert = require('chai').assert,
  m = require('mstring'),
  _ = require('underscore'),
  fs = require('fs'),
  pgcli = require('../../lib/pg-cli'),
  exec = require('execSync').exec,
  planner = require('../../lib/planner');

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
        planner.verifyOptions(global.baseClusterInstallPlan, options);
        planner.compileOptions(global.baseClusterInstallPlan, options);
        planner.install(global.baseClusterInstallPlan, options);

        var result = exec('sudo -u {xt.name} pg_ctlcluster {pg.version} {xt.name} reload'.format(options));

        assert.equal(result.code, 0, JSON.stringify(result));
        pgcli.dropcluster(options.pg.cluster);
      });
    });
  });
});
