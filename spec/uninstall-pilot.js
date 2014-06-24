var path = require('path'),
  planner = require('../'),
  assert = require('chai').assert;

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
      version: require('xtuple/package').version
    },
    pg: {
      version: '9.3',
      capacity: 8
    }
  };

  it('should run uninstall', function (done) {
    planner.compileOptions(options.plan, options);
    planner.verifyOptions(options.plan, options);
    planner.execute(options.plan, options)
      .then(done)
      .fail(assert.fail);
  });
});
