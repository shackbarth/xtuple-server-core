(function () {
  'use strict';

  /**
   * Clone the xtuple repositories
   */
  var clone = exports;

  var task = require('../../lib/task'),
    format = require('string-format'),
    pgcli = require('../../lib/pg-cli'),
    path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build'),
    rimraf = require('rimraf');

  _.extend(clone, task, /** @exports clone */ {

    /** @override */
    beforeInstall: function (options) {
      options.xt.scalarversion = options.xt.version.replace(/\./g, '');
    },

    /** @override */
    beforeTask: function (options) {
      // yes this is for real.
      // https://github.com/xtuple/xtuple-scripts/issues/68
      try {
        exec('umount /root');
      }
      catch (e) {
        // if we can't unmount it, maybe things will still work, but there's no
        // point in yelling too loudly about not being able to do something crazy
        console.log(e);
      }

      if (build.isTaggedVersion(options)) {
        options.xt.repoHash = 'v' + options.xt.version;
      }
      else {
        options.xt.repoHash = options.xt.version.slice(0, 6);
      }
    },

    /** @override */
    executeTask: function (options) {
j     _.each(clone.getRepositoryList(options), function (repo) {
        var template = _.extend({
            repo: repo,
            path: path.resolve(options.xt.srcdir, repo)
          }, options);

        if (fs.existsSync(template.path)) { return; }

        var cloneCommands = [
            exec('git clone --recursive https://github.com/xtuple/{repo}.git {path}'.format(template)),
            exec(('cd {path} && git checkout '+ options.xt.repoHash).format(template)),
            exec('cd {path} && npm install'.format(template)),
            exec('cd {path} && npm install -g'.format(template)),
          ],
          failed = _.difference(cloneCommands, _.where(cloneCommands, { code: 0 }));

        if (failed.length > 0) {
          throw new Error(JSON.stringify(failed, null, 2));
        }
      });

      // copy main repo files to user's home directory
      var rsync = exec('rsync -ar --exclude=".git" {xt.coredir}/* {xt.usersrc}'.format(options));
      if (rsync.code !== 0) {
        throw new Error(JSON.stringify(rsync, null, 2));
      }
    },

    /** @override */
    afterTask: function (options) {
      exec('chown -R {xt.name}:{xt.name} {xt.userhome}'.format(options));
      exec('chmod -R 700 {xt.userhome}'.format(options));
    },

    /**
     * @return list of repositories to clone
     */
    getRepositoryList: function (options) {
      return _.compact([
        'xtuple',
        'xtuple-extensions',
        build.hasPrivateExtensions(options) && 'private-extensions'
      ]);
    }
  });

})();
