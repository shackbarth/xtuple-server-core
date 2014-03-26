(function () {
  'use strict';

  /**
   * Archetypal install task. Tasks should extend this.
   */
  var archetype = exports;

  _.extend(archetype, /** @exports archetype */ {

    /**
     * Options map; define which command-line options this task is concerned
     * with. Options will be namespaced according to the module name. e.g.,
     * an option 'testop' in this task would be used as --sys-testop.
     * @memberof archetype
     */
    options: {

    },

    /**
     * Invoked before the install phase. Validate the preconditions required for
     * 'run' to complete successfully, which include environment, options
     * values, etc. Should not cause any side-effects.
     *
     * @memberof archetype
     * @return true if preconditions met, false otherwise.
     */
    validate: function (options) {
      return true;
    },

    /**
     * Invoked during the install phase, and before the 'run()' method. Perform any
     * setup tasks, and make sure the state of the machine is sane.
     *
     * @memberof archetype
     * @return true if ready to install, false otherwise
     */
    prelude: function (options) {
      return true;
    },

    /**
     * Install stuff. Failed operations should throw exceptions.
     * @abstract
     */
    install: function (options) {
      throw new Error('Tasks must override archetype#install');
    },

    /**
     * Invoked after the install phase. Perform any cleanup. Failed operations
     * should throw exceptions.
     * @memberof archetype
     */
    coda: function (options) {
      // do nothing unless overridden
    }
  });

})();
