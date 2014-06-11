var lib = require('xtuple-server-lib'),
  format = require('string-format'),
  semver = require('semver'),
  _ = require('lodash'),
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path');

_.extend(exports, lib.task, /** @exports xtuple-server-xt-install */ {

  /** @override */
  beforeInstall: function (options) {
    options.xt.scalarversion = options.xt.version.replace(/\./g, '');

    if (fs.existsSync(path.resolve(options.xt.coredir))) {
      exports.setNodeVersions(options);
    }
  },

  /** @override */
  beforeTask: function (options) {
    if (lib.util.isTaggedVersion(options)) {
      options.xt.repoHash = 'v' + options.xt.version;
    }
    else {
      options.xt.repoHash = options.xt.version.slice(0, 6);
    }
  },

  /** @override */
  executeTask: function (options) {
    _.each(lib.util.getRepositoryList(options), function (repo) {
      var template = _.extend({
          repo: repo,
          path: path.resolve(options.xt.srcdir, repo)
        }, options);

      if (!fs.existsSync(template.path)) {
        var clone = exec('git clone --recursive https://github.com/xtuple/{repo}.git {path}'.format(template)),
          checkout = exec(('cd {path} && git checkout '+ options.xt.repoHash).format(template));

        exports.setNodeVersions(options);
        template.npm = options.xt.npmBin;
        exec('cd {path} && {npm} install'.format(template));

        if (clone.code !== 0) {
          throw new Error(JSON.stringify(clone, null, 2));
        }
      }

      if (options.xt.usersrc !== options.xt.coredir) {

        // copy main repo files to user's home directory
        var userSourcePath = path.resolve(options.xt.userhome, options.xt.version, repo);
        exec('mkdir -p ' + userSourcePath);
        var rsync = exec([
            'rsync -ar --exclude=.git',// --exclude=node_modules',
            template.path + '/*',
            userSourcePath
          ].join(' '));
          
        if (rsync.code !== 0) {
          throw new Error(JSON.stringify(rsync, null, 2));
        }
      }
    });
  },

  /**
   * Return the node.js version specified in the package.json of the main
   * xtuple repo.
   */
  getPackageNodeVersion: function (options) {
    var pkg = require(path.resolve(options.xt.coredir, 'package')),
      node = pkg.engines.node;

    return exports.crudeVersionResolve(node);
  },

  crudeVersionResolve: function (version) {
    if (!semver.validRange(version)) {
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

  setNodeVersions: function (options) {
    options.xt.nodeVersion = exports.getPackageNodeVersion(options);
    options.xt.nodePath = path.dirname(exec('n bin '+ options.xt.nodeVersion).stdout);
    options.xt.nodeBin = path.resolve(options.xt.nodePath, 'node');
    options.xt.npmBin = path.resolve(options.xt.nodePath, 'npm');

    console.log(exec('n bin '+ options.xt.nodeVersion).stdout);
    console.log(options.xt.nodeVersion);
    console.log(options.xt.nodePath);
    console.log(options.xt.nodeBin);
    console.log(options.xt.npmBin);
  }
});
