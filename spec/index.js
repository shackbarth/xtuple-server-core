module.exports = require('requireindex')(__dirname);

describe('(v'+ require('../package').version + ') xtuple-server', function () {
  describe('sanity', function () {

  });
  describe('plans', function () {
    require('./uninstall-pilot');
    require('./install-pilot');
  });
});
