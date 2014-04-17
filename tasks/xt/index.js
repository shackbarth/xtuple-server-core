(function () {
  'use strict';

  /** @exports xt */
  module.exports = {
    clone: require('./clone'),
    database: require('./database'),
    serverconfig: require('./serverconfig'),
    testconfig: require('./testconfig'),
    runtests: require('./runtests')
  };
})();
