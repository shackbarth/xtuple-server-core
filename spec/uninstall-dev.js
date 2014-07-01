var path = require('path'),
  planner = require('../'),
  assert = require('chai').assert;

describe('uninstall-dev', function () {
  var planObject = require('../plans')['uninstall-dev'];
  var options = {
    planName: 'uninstall-dev',
    plan: planObject.plan,
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
      version: '9.3',
      capacity: 8
    }
  };

  it('should run uninstall', function () {
    planner.compileOptions(options.plan, options);
    planner.verifyOptions(options.plan, options);
    planner.execute(options.plan, options);
  });
});
