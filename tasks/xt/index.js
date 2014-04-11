(function () {
  'use strict';

  /** @exports xt */
  module.exports = {
    clone: require('./clone'),
    database: require('./database'),
    build_common: require('./build_common'),
    build_main: require('./build_main'),
    serverconfig: require('./serverconfig'),
    testconfig: require('./testconfig'),
    runtests: require('./runtests')
  };
})();
