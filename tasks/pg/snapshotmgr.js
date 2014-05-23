var lib = require('../../lib'),
  fs = require('fs'),
  os = require('os'),
  cron = require('cron-parser'),
  exec = require('execSync').exec,
  path = require('path'),
  _ = require('lodash');

/**
 * Schedule backups of a postgres cluster.
 */
_.extend(exports, lib.task, /** @exports snapshotmgr */ {

  options: {
    enablesnap: {
      optional: '[boolean]',
      description: 'Enable the snapshot manager',
      value: false
    },
    snapschedule: {
      optional: '[cron]',
      description: 'crontab entry for snapshot schedule [0 0 * * *] (daily)',
      value: '0 0 * * *'
    },
    snapshotcount: {
      optional: '[integer]',
      description: 'The number of backup snapshots to retain',
      value: 7
    }
  },

  /** @override */
  beforeInstall: function (options) {
    options.pg.pm2 = {
      template: fs.readFileSync(path.resolve(__dirname, 'pm2-backup-service.json')).toString()
    };
    cron.parseExpressionSync(options.pg.snapschedule);
  },

  /** @override */
  beforeTask: function (options) {
    // XXX
    return;
    exec('mkdir -p ' + options.pg.snapshotdir);
    exec(('chown {xt.name}:xtuser '+ options.pg.snapshotdir).format(options));
    fs.writeFileSync(options.pg.pm2.configfile, options.pg.pm2.template.format(options));
  },

  /** @override */
  executeTask: function (options) {
    return;
    if (!options.pg.enablesnap) { return; }

    var start = exec('xtupled start {pg.pm2.configfile}'.format(options));

    if (start.code !== 0) {
      throw new Error(JSON.stringify(start));
    }
  },

  /** @override */
  afterTask: function (options) {
    exec('service xtuple {xt.version} {xt.name} restart'.format(options));
  },

  /**
   * Rotate local snapshots; This function will either delete old snapshots
   * or do nothing.
   *
   * @public
   */
  rotateSnapshot: function (options) {
    var maxlen = options.pg.snapshotcount,
      name = options.xt.name,
      version = options.xt.version,
      ls = fs.readdirSync(options.pg.snapshotdir),
      db_groups = _.groupBy(
        _.map(ls, function (file) {
          return snapshotmgr.parseFilename(file);
        }),
        'dbname'
      ),
      expired = _.flatten(_.map(db_groups, function (snapshots, name) {
        return _.first(_.sortBy(snapshots, 'ts'), (snapshots.length - maxlen));
      }));

    return _.map(expired, function (file) {
      fs.unlinkSync(path.resolve(options.pg.snapshotdir, file.original));
      return file;
    });
  }
});
