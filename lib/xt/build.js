(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    _ = require('underscore'),
    exec = require('execSync'),
    sync = require('sync');

  var build = exports;

  _.extend(build, /** @exports build */ {

    options: {
      staging: {
        optional: '[boolean]',
        description: 'Additionally create a staging area using a copy of the main database',
        value: true
      },
      extensions: {
        optional: '[csv]',
        description: 'Comma-delimited list of extensions to install',
        value: ''
      }
    },

    // extension path mapping
    extensions: {
      'private': [
        'inventory',
        'manufacturing'
      ],
      'public': [

      ]
    },

    /** @static */
    run: function (options) {
      var xt = options.xt,
        src_path = path.resolve(xt.srcdir),
        private_ext_path = path.resolve(src_path, '..', 'private-extensions'),
        public_ext_path = path.resolve(src_path, '..', 'xtuple-extensions'),
        build_script = path.resolve(xt.srcdir, 'scripts/build_app.js'),
        cd_cmd = 'cd {src} && '.format({ src: src_path }),
        build_template = 'sudo node {bin} -i -b {backup} -d {dbname} -c {configjs}',
        extension_template = 'sudo node {bin} -d {dbname} -e {ext_path} -c {configjs}',
        extensions = _.compact(xt.extensions.split(',')),
        descriptors = _.compact(_.union(xt.database.backupfiles, xt.database.maindb && {
          file: xt.database.maindb,
          stem: xt.database.maindb.replace('.backup', '')
        }));
        
      // build the demo databases
      _.each(descriptors, function (descriptor) {
        var dbname = descriptor.stem
          .split('.').join('')
          .split('-').join(''),
        build_cmd = cd_cmd + build_template.format({
            bin: build_script,
            backup: descriptor.file,
            dbname: dbname,
            configjs: xt.serverconfig.config_js,
            logfile: options.logfile
          }),
          build_result = exec(build_cmd);

        console.log(build_result);

        return build_result && _.map(extensions, function (ext) {
          console.log(exec(cd_cmd + extension_template.format({
            bin: build_script,
            dbname: dbname,
            ext_path: path.resolve(private_ext_path, 'source', build.extensions.private[ext]),
            configjs: xt.serverconfig.config_js,
            logfile: options.logfile
          })));
        });
      });
    }
  });
})();
