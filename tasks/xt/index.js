(function () {
  'use strict';

  /** @exports xt */
  module.exports = {
    database: require('./database'),
    build: require('./build'),
    build_common: require('./build_common'),
    build_main: require('./build_main'),
    serverconfig: require('./serverconfig'),
    testconfig: require('./testconfig')
  };

})();
