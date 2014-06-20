var _ = require('lodash'),
  path = require('path'),
  planner = require('./planner');

describe('uninstall-pilot', function () {
  this.planObject = require('../plans')['uninstall-pilot'];
  this.options = {
    planName: 'uninstall-pilot',
    plan: this.planObject.plan,
    requiresRoot: true,
    local: {
      workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
    },
    xt: {
      demo: true,
      version: this.xtupleVersion
    },
    pg: {
      version: process.env.XT_PG_VERSION,
      capacity: 8
    }
  };
  planner.describe(this);
});
