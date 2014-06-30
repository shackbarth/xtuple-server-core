var _ = require('lodash'),
  path = require('path'),
  planner = require('./planner');

describe('install-dev', function () {
  this.planObject = require('../plans')['install-dev'];
  this.options = {
    planName: 'install-dev',
    plan: this.planObject.plan,
    type: 'dev',
    requiresRoot: true,
    local: {
      workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
    },
    xt: {
      demo: true,
      version: require('xtuple/package').version
    },
    pg: {
      version: process.env.XT_PG_VERSION,
      capacity: 8
    }
  };
  planner.compileOptions(this.options.plan, this.options);
  planner.verifyOptions(this.options.plan, this.options);
  planner.describe(this);
});
