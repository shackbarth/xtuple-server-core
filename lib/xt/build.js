(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    sync = require('sync'),
    semver = require('semver');

  var build = exports;

  _.extend(build, /** @exports build_common */ {

    /**
     * Map edition -> extension[]. These lists of extensions are in addition
     * to the 'core' extensions already installed by default.
     */
    editions: {
      core: [ ],
      manufacturing: [
        'inventory',
        'manufacturing'
      ],
      distribution: [
        'inventory',
        'distribution'
      ],
      enterprise: [
        'inventory',
        'distribution',
        'manufacturing'
      ]
    },

    // extension path mapping
    extension_prefixes: {
      'private': [
        'manufacturing',
        'inventory',
        'distribution'
      ],
      'xtuple': [

      ]
    },

    /**
     * Generate the core app installation command
     * @static
     */
    getCoreBuildCommand: function (db, options) {
      var coredir = options.xt.coredir,
        formatter = _.defaults(db, {
          coredir: coredir,
          bin: path.resolve(coredir, 'scripts/build_app.js'),
          config_js: path.resolve(options.xt.serverconfig.config_js)
        }),
        cmd = [
          'cd {coredir} &&',
          'sudo node {bin}',
          '-c {config_js}',
          '-b {file}',
          '-d {dbname}',
          '-i'
        ].join(' ').format(formatter);

      return cmd;
    },

    /**
     * Generate the extension installation command
     * @static
     */
    getExtensionBuildCommand: function (db, options, extension) {
      var coredir = path.resolve(options.xt.coredir),
        private_ext_path = path.resolve(coredir, '..', 'private-extensions'),
        public_ext_path = path.resolve(coredir, '..', 'xtuple-extensions'),
        prefix = _.find(_.keys(build.extension_prefixes), function (key) {
          return _.contains(build.extension_prefixes[key], extension);
        }),
        formatter = _.defaults(db, {
          coredir: coredir,
          bin: path.resolve(coredir, 'scripts/build_app.js'),
          config_js: path.resolve(options.xt.serverconfig.config_js),
          extension_path: path.resolve(coredir, '..', prefix + '-extensions', 'source', extension)
        });

      var cmd = [
        'cd {coredir} &&',
        'sudo node {bin}',
        '-c {config_js}',
        '-e {extension_path}',
        '-d {dbname}'
      ].join(' ').format(formatter);

      console.log(cmd);
      return cmd;
    },

    /**
     * Return whether this installation will install any private extensions
     */
    hasPrivateExtensions: function (options) {
      return _.intersection(
        build.extension_prefixes.private, build.editions[options.xt.edition]
      ).length > 0;
    },

    /**
     * Return true if the xtuple version to install is a tag and false
     * otherwise.
     */
    isTaggedVersion: function (options) {
      return semver.valid(options.xt.version);
    }
  });
})();
