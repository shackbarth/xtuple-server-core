var path = require('path'),
  planner = require('../');

describe('uninstall-pilot', function () {
  var planObject = require('../plans')['uninstall-pilot'];
  var options = {
    planName: 'uninstall-pilot',
    plan: planObject.plan,
    type: 'pilot',
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

  it('should run uninstall', function () {
    planner.compileOptions(options.plan, options);
    planner.verifyOptions(options.plan, options);
    planner.uninstall(options);
  });
});
