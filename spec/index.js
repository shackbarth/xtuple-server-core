module.exports = {
  planner: require('./planner')
};

describe('xtuple-server', function () {
  describe('sanity', function () {

  });
  describe('plans', function () {
    require('./uninstall-pilot');
    require('./install-pilot');
  });
});
