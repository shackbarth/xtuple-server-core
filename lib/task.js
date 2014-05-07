(function () {
  'use strict';

  /**
   * Archetypal install task. Tasks should extend this.
   */
  var task = exports;

  var _ = require('lodash');

  _.extend(task, /** @exports task */ {

    /**
     * Options map; define which command-line options this task is concerned
     * with. Options will be namespaced according to the module name. e.g.,
     * an option 'testop' in this task would be used as --sys-testop.
     * @memberof task
     */
    options: {

    },

    /**
     * Invoked before the install phase. Validate the preconditions required for
     * 'run' to complete successfully, which include environment, options
     * values, etc. Should not cause any side-effects.
     *
     * @memberof task
     * @return true if preconditions met, false otherwise.
     */
    beforeInstall: function (options) {
      return true;
    },

    /**
     * Invoked during the install phase, and before the 'run()' method. Perform any
     * setup tasks, and make sure the state of the machine is sane.
     *
     * @memberof task
     * @return true if ready to install, false otherwise
     */
    beforeTask: function (options) {
      return true;
    },

    /**
     * Run the task. Failed operations should throw exceptions.
     * @abstract
     */
    executeTask: function (options) {
      throw new Error('Tasks must override task#executeTask');
    },

    /**
     * Invoked after the install phase. Perform any cleanup. Failed operations
     * should throw exceptions.
     * @memberof task
     */
    afterTask: function (options) {
      // do nothing unless overridden
    },

    afterInstall: function (options) {
      // do nothing unless overridden
    },

    uninstall: function (options) {
      // do nothing unless overridden
    }
  });
})();
