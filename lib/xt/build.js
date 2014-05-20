(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('lodash'),
    exec = require('execSync').exec,
    semver = require('semver');

  var build = exports;

  _.extend(build, /** @exports build */ {

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
          bin: path.resolve(options.xt.usersrc, 'scripts/build_app.js'),
        }, db, options),
        cmd = [
          'cd {xt.usersrc} &&',
          'sudo -u {xt.name} {xt.nodeBin} {bin}',
          '-c {xt.buildconfigfile}',
          '-d {dbname}',
          '-i -b {filename}'
        ].join(' ').format(formatter);

      return cmd;
    },

    /**
     * Generate the command to build xtuple databases from source
     * @static
     */
    getSourceBuildCommand: function (db, options) {
      var formatter = _.extend({
          bin: path.resolve(options.xt.usersrc, 'scripts/build_app.js'),
        }, db, options),
        cmd = [
          'cd {xt.usersrc} &&',
          'sudo -u {xt.name} {xt.nodeBin} {bin}',
          '-c {xt.buildconfigfile}',
          '-d {dbname}',
          '-i -s {filename}'
        ].join(' ').format(formatter);

      return cmd;
    },

    /**
     * Generate the extension installation command
     * @static
     */
    getExtensionBuildCommand: function (db, options, extension) {
      var private_ext_path = path.resolve(options.xt.usersrc, '..', 'private-extensions'),
        public_ext_path = path.resolve(options.xt.usersrc, '..', 'xtuple-extensions'),
        prefix = _.find(_.keys(build.extension_prefixes), function (key) {
          return _.contains(build.extension_prefixes[key], extension);
        }),
        formatter = _.extend({
          bin: path.resolve(options.xt.usersrc, 'scripts/build_app.js'),
          extension_path: path.resolve(options.xt.usersrc, '..', prefix + '-extensions', 'source', extension)
        }, db, options);

      var cmd = [
        'cd {xt.usersrc} &&',
        'sudo -u {xt.name} {xt.nodeBin} {bin}',
        '-c {xt.buildconfigfile}',
        '-e {extension_path}',
        '-d {dbname}'
      ].join(' ').format(formatter);

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
    },

    wrapModule: function (obj) {
      return 'module.exports = '+ JSON.stringify(obj, null, 2) + ';';
    }
  });
})();
