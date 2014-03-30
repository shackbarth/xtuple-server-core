(function () {
  'use strict';

  /** @exports nginx */
  module.exports = {
    site: require('./site'),
    ssl:  require('./ssl')
  };
})();
