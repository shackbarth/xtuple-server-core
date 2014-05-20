(function () {
  'use strict';

  var lib = require('../../lib'),
    format = require('string-format'),
    path = require('path'),
    semver = require('semver'),
    fs = require('fs'),
    _ = require('lodash'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build'),
    rimraf = require('rimraf');

  _.extend(exports, lib.task, /** @exports clone */ {

    /** @override */
    beforeInstall: function (options) {
      options.xt.scalarversion = options.xt.version.replace(/\./g, '');
    },

    /** @override */
    beforeTask: function (options) {
      if (build.isTaggedVersion(options)) {
        options.xt.repoHash = 'v' + options.xt.version;
      }
      else {
        options.xt.repoHash = options.xt.version.slice(0, 6);
      }
    },

    /** @override */
    executeTask: function (options) {
      _.each(exports.getRepositoryList(options), function (repo) {
        var template = _.extend({
            repo: repo,
            path: path.resolve(options.xt.srcdir, repo)
          }, options);

        if (fs.existsSync(template.path)) { return; }

        var clone = exec('git clone --recursive https://github.com/xtuple/{repo}.git {path}'.format(template)),
          checkout = exec(('cd {path} && git checkout '+ options.xt.repoHash).format(template));

        options.xt.nodeVersion = exports.getPackageNodeVersion(options);
        options.xt.nodePath = path.dirname(exec('n bin '+ options.xt.nodeVersion).stdout);
        options.xt.nodeBin = path.resolve(options.xt.nodePath, 'node');
        options.xt.npmBin = path.resolve(options.xt.nodePath, 'npm');

        template.npm = options.xt.npmBin;
        exec('cd {path} && {npm} install --silent'.format(template));

        if (clone.code !== 0) {
          throw new Error(JSON.stringify(clone, null, 2));
        }
      });

      // copy main repo files to user's home directory
      var rsync = exec('rsync -ar --exclude=.git --exclude=node_modules {xt.coredir}/* {xt.usersrc}'.format(options));
      if (rsync.code !== 0) {
        throw new Error(JSON.stringify(rsync, null, 2));
      }
      fs.symlinkSync(
        path.resolve(options.xt.usersrc, 'node_modules'), 
        path.resolve(options.xt.srcdir, 'node_modules')
      );
    },

    /**
     * Return the node.js version specified in the package.json of the main
     * xtuple repo.
     */
    getPackageNodeVersion: function (options) {
      var pkg = require(path.resolve(options.xt.srcdir, 'package')),
        node = pkg.engines.node;

      return exports.crudeVersionResolve(node);
    },

    crudeVersionResolve: function (version) {
      if (!semver.valid(version)) {
        throw new Error('xtuple package version does not seem to be valid: '+ version);
      }

      if ('0.8.x' === version) {
        return '0.8.26';
      }
      else {
        return semver.clean(version);
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
