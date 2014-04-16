(function () {
  'use strict';

  /**
   * Mobile-ize the main databases
   */
  var build_main = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    rimraf = require('rimraf'),
    fs = require('fs'),
    pgcli = require('../../lib/pg-cli'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build');

  _.extend(build_main, task, /** @exports build_main */ {

    /** @override */
    beforeTask: function (options) {
      require('./build_common').beforeTask(options);
    },

    /** @override */
    doTask: function (options) {
      var xt = options.xt,
        extensions = build.editions[xt.edition],
        databases = _.where(xt.database.list, { main: true }),
        repos = require('./clone').getRepositoryList(options);

      _.each(repos, function (repo) {
        var template = {
            repo: repo,
            path: path.resolve(options.xt.srcdir, repo),
            out: path.resolve(options.xt.usersrc, '..')
          },
          rsync = exec('rsync -ar --exclude=".git" {path} {out}'.format(template));

        if (rsync.code !== 0) {
          throw new Error(JSON.stringify(rsync, null, 2));
        }

        exec('chown -R {xt.name}:{xt.name} {xt.userhome}'.format(options));
        exec('chmod -R 700 {xt.userhome}'.format(options));
      });

      // build the main database and pilot, if specified
      _.each(databases, function (db) {
        rimraf.sync(path.resolve(options.xt.usersrc, 'scripts/lib/build'));

        var buildResult = exec(build.getCoreBuildCommand(db, options));
        console.log(buildResult);
        if (buildResult.code !== 0) {
          throw new Error(buildResult.stdout);
        }

        // install extensions specified by the edition
        _.each(extensions, function (ext) {
          var result = exec(build.getExtensionBuildCommand(db, options, ext));
          if (result.code !== 0) {
            throw new Error(result.stdout);
          }
        });
      });
    }
  });
})();
