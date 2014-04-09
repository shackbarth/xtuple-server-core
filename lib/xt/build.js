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
      var formatter = _.extend({
          bin: path.resolve(options.xt.coredir, 'scripts/build_app.js'),
        }, db, options),
        cmd = [
          'cd {xt.coredir} &&',
          'node {bin}',
          '-c {xt.configfile}',
          '-d {dbname}'
        ].join(' ').format(formatter);

      return cmd;
    },

    /**
     * Generate the extension installation command
     * @static
     */
    getExtensionBuildCommand: function (db, options, extension) {
      var private_ext_path = path.resolve(options.xt.coredir, '..', 'private-extensions'),
        public_ext_path = path.resolve(options.xt.coredir, '..', 'xtuple-extensions'),
        prefix = _.find(_.keys(build.extension_prefixes), function (key) {
          return _.contains(build.extension_prefixes[key], extension);
        }),
        formatter = _.extend({
          bin: path.resolve(options.xt.coredir, 'scripts/build_app.js'),
          extension_path: path.resolve(options.xt.coredir, '..', prefix + '-extensions', 'source', extension)
        }, db, options);

      var cmd = [
        'cd {xt.coredir} &&',
        'node {bin}',
        '-c {xt.configfile}',
        '-e {extension_path}',
        '-d {dbname}'
      ].join(' ').format(formatter);

      return cmd;
    },

    /**
     * Ignore benign errors that occur during a normal pg_restore, and fail on
     * any unexpected errors.
     */
    trapRestoreErrors: function (restoreResult) {
      if (restoreResult.code === 0) { return; }

      var match = /errors ignored on restore: (\d+)/.exec(restoreResult.stdout),
        benignError = /ERROR:\s+language "plpgsql" already exists/.test(restoreResult.stdout),
        ignored = match && parseInt(match[1]);

      if (ignored > 1) {
        throw new Error('Too many errors encountered during pg_restore: '+ restoreResult.stdout);
      }
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
