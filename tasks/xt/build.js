(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('execSync').exec,
    sync = require('sync');

  var build = exports;

  _.extend(build, /** @exports build_common */ {

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
      var appdir = path.resolve(options.xt.appdir),
        formatter = _.defaults(db, {
          appdir: appdir,
          bin: path.resolve(appdir, 'scripts/build_app.js'),
          config_js: path.resolve(options.xt.serverconfig.config_js)
        }),
        cmd = [
          'cd {appdir} &&',
          'sudo node {bin}',
          '-c {config_js}',
          '-b {file}',
          '-d {flavor}',
          '-i'
        ].join(' ').format(formatter);

      console.log(cmd);
      return cmd;
    },

    /**
     * Generate the extension installation command
     * @static
     */
    getExtensionBuildCommand: function (db, options, extension) {
      var appdir = path.resolve(options.xt.appdir),
        private_ext_path = path.resolve(appdir, '..', 'private-extensions'),
        public_ext_path = path.resolve(appdir, '..', 'xtuple-extensions'),
        prefix = _.find(_.keys(build.extension_prefixes), function (key) {
          return _.contains(build.extension_prefixes[key], extension);
        }),
        formatter = _.defaults(db, {
          appdir: appdir,
          bin: path.resolve(appdir, 'scripts/build_app.js'),
          config_js: path.resolve(options.xt.serverconfig.config_js),
          extension_path: path.resolve(appdir, '..', prefix + '-extensions', 'source', extension)
        });

      var cmd = [
        'cd {appdir} &&',
        'sudo node {bin}',
        '-c {config_js}',
        '-e {extension_path}',
        '-d {flavor}'
      ].join(' ').format(formatter);

      console.log(cmd);
      return cmd;
    }
  });
})();
