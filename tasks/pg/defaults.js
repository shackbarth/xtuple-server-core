var os = require('os'),
  posix = require('posix'),
  phi = (Math.sqrt(5) + 1) / 2,
  MB = 1048576,
  GB = Math.pow(1048576, 2);

/**
 * @module defaults
 * All size values in megabytes.
 * */
module.exports = {
  env: {
    phi: phi,
    stacklimit: posix.getrlimit('stack').soft,
    platform: os.platform(),
    slots: 1,
    MB: MB,
    GB: GB,

    /**
     * <http://www.postgresql.org/docs/9.3/static/kernel-resources.html>
     * Docs: "if pages, ceil(SHMMAX/PAGE_SIZE)" ...and "A page is almost always
     * 4096 bytes except in unusual kernel configurations".
     */
    shmmax: os.totalmem(),
    shmall: Math.ceil(os.totalmem() / 4096)
  },

  /**
   * Default resource allocations for different slot types.
   */
  slot: {
    /**
     * default values for a base 'slot' which is used as a frame of reference
     * for provisioning and tuning.
     * @const
     */
    base: {
      locale: 'en_US.UTF-8',
      max_connections: 16,
      work_mem: 1,
      temp_buffers: 16,
      shared_buffers: 128,
      maintenance_work_mem: 64
    },

    /** 
     * A dedicated slot consumes the resources of the entire server,. e.g. for
     * appliance installations.
     */
    dedicated: {
      shared_buffers:  (os.totalmem() / 2) / MB,
      max_connections: 64,
      maintenance_work_mem: 256
    },

    /**
     * Cloud slot will be production installs on a shared server
     */
    cloud: {
      shared_buffers: 256,
      max_connections: 32
    },

    /**
     * Slot type used for demo-type databases, quickstart, free trials, or
     * possibly development.
     */
    test: {
      shared_buffers: 128,
      max_connections: 8,
      maintenance_work_mem: 16
    }
  }
};
