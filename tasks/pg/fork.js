var lib = require('../../lib'),
  config = require('./config'),
  moment = require('moment'),
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
    config.discoverCluster(options);
  },

  /** @override */
  executeTask: function (options) {
    options.pg.infile = exports.getSnapshotPath(options);
    options.pg.dbname = exports.getForkName(options);
  },

  /**
   * Return the name of a forked database.
   */
  getForkName: function (options) {
    return '{dbname}_copy_{ts}'.format({
      dbname: options.pg.dbname,
      ts: moment().format('MMDDhhmm')
    });
  },

  /**
   * Return path of a snapshot file
   * @param options - typical options object
   * @param options.date - date of snapshot (MMDDhhmm)
   * @param options.dbname - name of database
   * @public
   */
  getSnapshotPath: function (options) {
    var ext = (options.pg.dbname === 'globals' ? '.sql' : '.dir.gz');
    return path.resolve(options.pg.snapshotdir, require('./fork').getForkName(options) + ext);
  },

  /**
   * Return an object consisting of the backup filename components.
   * @public
   */
  parseForkName: function (filename) {
    var base = path.basename(filename),
      halves = base.split('_copy_');

    return {
      original: filename,
      dbname: halves[0],
      ts: moment(halves[1], 'MMDDhhmm').valueOf()
    };
  }

});
