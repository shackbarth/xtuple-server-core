var latest = require('latest-version');

module.exports = {
  planner: require('./planner')
};

describe('xtuple-server', function () {
  var self = this;

  before(function (done) {
    latest('xtuple', function (err, version) {
      self.xtupleVersion = version;
      done();
    }); 
  }); 

  describe('sanity', function () {

  });

  describe('plans', function () {
    require('./uninstall-pilot');
    require('./install-pilot');
  });
});
