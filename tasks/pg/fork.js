var lib = require('../../lib'),
  pg = require('./'),
  fs = require('fs'),
  exec = require('execSync').exec,
  path = require('path'),
  _ = require('lodash');

/**
 * Fork an existing database.
 */
_.extend(exports, lib.task, /** @exports fork-database */ {

  options: {
    dbname: {
      required: '<dbname>',
      description: 'Name of database to operate on'
    }
  },

  /** @override */
  beforeTask: function (options) {
    pg.config.discoverCluster(options);
  },

  /** @override */
  executeTask: function (options) {
    options.pg.dbname = exports.getForkName(options);
  },

  /**
   * Return the name of a forked database.
   */
  getForkName: function (options) {
    return '{dbname}_fork_{version}_{ts}'.format({
      dbname: options.pg.dbname,
      version: options.xt.version.split('.').join(''),
      ts: moment().format('MMDDhhmm')
    });
  },

  /**
   * Return an object consisting of the backup filename components.
   * @public
   * @returns {
   *    name: STRING [kelhay],
   *    dbname: VERSION [1.8.1],
   *    ts: DATE [{Date}]
   * }
   */
  parseForkName: function (filename) {
    var base = path.basename(filename),
      halves = base.split('_fork_'),
      tokens = halves[1].split('_');

    return {
      original: filename,
      dbname: halves[0],
      version: tokens[0],
      ts: moment(tokens[1], 'MMDDhhmm').valueOf()
    };
  },

});
