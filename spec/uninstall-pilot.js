var _ = require('lodash'),
  path = require('path'),
  planner = require('./planner');

describe('uninstall-pilot', function () {
  this.options = {
    planName: 'uninstall-pilot',
    requiresRoot: true,
    local: {
      workspace: path.resolve(process.cwd(), 'node_modules', 'xtuple')
    },
    xt: {
      demo: true
    },
    pg: {
      version: process.env.XT_PG_VERSION,
      capacity: 8
    }
  };
  planner.describe(this);
});
