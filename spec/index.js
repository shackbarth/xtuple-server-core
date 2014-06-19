module.exports = {
  planner: require('./planner')
};

describe('(v'+ require('xtuple-server/package').version + ') xtuple-server', function () {
  describe('sanity', function () {

  });
  describe('plans', function () {
    require('./uninstall-pilot');
    require('./install-pilot');
  });
});
