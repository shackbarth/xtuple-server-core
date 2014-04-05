(function () {
  'use strict';

  /** @exports tasks */
  module.exports = {
    pg: require('./pg'),
    xt: require('./xt'),
    sys: require('./sys'),
    nginx: require('./nginx')
  };

})();

