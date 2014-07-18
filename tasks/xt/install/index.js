var lib = require('xtuple-server-lib'),
  _ = require('lodash'),
  github = require('nex-github'),
  r = require('node-latest-version'),
  n = require('n-api'),
  proc = require('child_process'),
  fs = require('fs'),
  path = require('path');

var xtInstall = _.extend(exports, lib.task, /** @exports xtuple-server-xt-install */ {

  options: {
    ghuser: {
      optional: '[ghuser]',
      description: 'Github Account username',
      validate: function (value, options) {
        if (!_.isEmpty(value) && _.isEmpty(options.xt.ghpass)) {
          throw new Error('cannot use xt-ghuser without xt-ghpass');
        }
        if (process.env.CI) {
          log.warn('Refusing to use xt-ghuser in CI environment');
          return null;
        }
        return (value || '').trim();
      }
    },
    ghpass: {
      optional: '[ghpass]',
      description: 'Github Account password',
      validate: function (value, options) {
        if (!_.isEmpty(value) && _.isEmpty(options.xt.ghuser)) {
          throw new Error('cannot use xt-ghpass without xt-ghuser');
        }
        if (process.env.CI) {
          log.warn('Refusing to use xt-ghpass in CI environment');
          return null;
        }
        return (value || '').trim();
      }
    }
  },

  /** @override */
  beforeTask: function (options) {
    // add github.com to known_hosts file to avoid host authenticity prompt
    if (process.env.CI) {
      try {
        proc.spawnSync('ssh', [ '-o', 'StrictHostKeyChecking=no', 'git@github.com' ], { stdio: 'ignore' });
      }
      catch (e) {
        log.silly('xt-install', e.stack.split('\n'));
      }
    }
  },

  /** @override */
  executeTask: function (options) {
    if (options.planName === 'install-dev') {
      var pkg = require(path.resolve(options.local.workspace, 'package'));
      var node = pkg.engines && pkg.engines.node;
      options.xt.nodeVersion = r.satisfy.sync(node);

      log.info('xt-install', 'local-workspace expected to already be npm-installed. skipping');
      log.info('xt-install', 'using node', options.xt.nodeVersion);
      return;
    }

    _.each(lib.util.getRepositoryList(options), function (repo) {
      var release = {
        org: 'xtuple',
        repo: repo,
        version: options.xt.gitVersion,
        username: options.xt.ghuser,
        password: options.xt.ghpass,
        target: path.resolve(options.xt.userdist, repo)
      };

      if (fs.existsSync(release.target)) {
        log.info('xt-install', release.repo, release.version, 'already installed. skipping download');
        return;
      }

      log.http('xt-install downloading', release.repo, release.version);

      github.getRelease.sync(release);
      github.extractRelease.sync(release);

      if (repo === 'xtuple') {
        var pkg = require(path.resolve(release.target, 'package'));
        var node = pkg.engines && pkg.engines.node;
        options.xt.nodeVersion = r.satisfy.sync(node);

        log.info('xt-install', 'using node', options.xt.nodeVersion);
        n(options.xt.nodeVersion);
      }

      log.http('xt-install', 'installing npm module...');
      proc.execSync([ 'cd', release.target, '&& npm install' ].join(' '), { stdio: 'ignore' });
    });
  },

  /** @override */
  afterTask: function (options) {
    proc.spawnSync('chown', [ '-R', options.xt.name, options.local.workspace ]);
    n(process.version);
  }
});
