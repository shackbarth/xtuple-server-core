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
    _ = require('underscore'),
    exec = require('execSync').exec,
    build = require('../../lib/xt/build'),
    rimraf = require('rimraf');

  _.extend(clone, task, /** @exports clone */ {

    options: {
      version: {
        optional: '[version]',
        description: 'xTuple Mobile App Version',
        value: '1.8.2'
      }
    },

    /** @override */
    beforeInstall: function (options) {
      options.xt.srcdir = path.resolve('/usr/local/xtuple/src/', options.xt.version);
      options.xt.coredir = path.resolve(options.xt.srcdir, 'xtuple');
      options.xt.extdir = path.resolve(options.xt.srcdir, 'xtuple-extensions');
      options.xt.privatedir = path.resolve(options.xt.srcdir, 'private-extensions');
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

      /*
      try {
        rimraf.sync(options.xt.coredir);
        rimraf.sync(options.xt.extdir);
        rimraf.sync(options.xt.privatedir);
        fs.mkdirSync(options.xt.srcdir);
      }
      catch (e) {
        
      }
      */
    },

    /** @override */
    doTask: function (options) {
      if (build.hasPrivateExtensions(options)) {
        exec('git config --global credential.helper \'cache --timeout=3600\'');
      }

      _.each(clone.getRepositoryList(options), function (repo) {
        var template = _.extend({
          repo: repo,
          path: path.resolve(options.xt.srcdir, repo)
        }, options);

        if (fs.existsSync(template.path)) { return; }
          
        exec('git clone --recursive https://github.com/xtuple/{repo}.git {path}'.format(template));
        exec('cd {path} && git checkout '+ options.xt.repoHash);
        exec('cd {path} && npm install --production -g'.format(template));
        exec('cd {path} && npm install'.format(template));
      });
    },

    /** @override */
    afterTask: function (options) {
      exec('chown -R xtadmin:xtuser '+ options.xt.coredir);
      exec('chown -R xtadmin:xtuser '+ options.xt.extdir);
      exec('chown -R xtadmin:xtadmin '+ options.xt.privatedir);
      
      exec('chmod o-rwx,u=rwx,g=rx '+ options.xt.coredir);
      exec('chmod o-rwx,u=rwx,g=rx '+ options.xt.extdir);
      exec('chmod o-rwx,u=rwx,g=rx '+ options.xt.privatedir);
    },

    /** @override */
    afterInstall: function (options) {
      rimraf.sync(options.xt.privatedir);
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
