var _ = require('lodash'),
  task = require('../');

exports.afterTask = function (options) {
  describe('source databases', function () {
    beforeEach(function () {
      options.xt.demo = false;
      options.xt.quickstart = false;
      options.xt.empty = false;
    });
    it('should be able to build the "quickstart" database from source', function () {
      options.xt.quickstart = true;
      task.executeTask(options);
      task.afterTask(options);
    });
    it('should be able to build the "empty" database from source', function () {
      options.xt.empty = true;
      task.executeTask(options);
      task.afterTask(options);
    });
    after(function () {
      options.xt.demo = true;

      options.xt.quickstart = false;
      options.xt.empty = false;
    });
  });
};
