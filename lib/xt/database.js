(function () {
  'use strict';

  var format = require('string-format'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore'),
    exec = require('exec-sync'),
    url_template = 'http://sourceforge.net/projects/postbooks/files/' +
      '03%20PostBooks-databases/{version}/postbooks_{flavor}-{version}.backup/download';

  var database = exports;

  _.extend(database, /** @exports database */ {

    options: {
      version: {
        optional: '[version]',
        description: 'xTuple Mobile App Version',
        value: '1.8.0'
      },
      maindb: {
        optional: '[path]',
        description: 'Path to primary database .backup file to use in production',
        value: ''
      },
    },

    versions: {
      '1.7.2': '4.3.0',
      '1.8.0': '4.3.0',
      '1.8.1': '4.3.0',
      '1.8.2': '4.3.0',
      '1.8.3': '4.3.0',
      '1.8.4': '4.3.0',
      '1.8.5': '4.3.0'
    },
    flavors: [ 'quickstart', 'demo', 'empty' ],

    run: function (options) {
      var xt = options.xt,
        download_template = '{dbname}-{flavor}-{version}',
        download_format = {
          dbname: options.pg.name,
          version: database.versions[options.xt.version]
        },
        files = _.map(database.flavors, function (flavor) {
          var flavor_format = _.extend({ flavor: flavor }, download_format),
            filestem = download_template.format(flavor_format),
            wget_format = {
              file: path.resolve(options.xt.srcdir, '..', filestem + '.backup'),
              url: url_template.format(flavor_format)
            };
          
          if (!fs.existsSync(wget_format.file)) {
            exec('wget -qO {file} {url}'.format(wget_format));
          }
          return {
            stem: filestem,
            file: wget_format.file,
            url: wget_format.url
          };
        }),
        maindb_path = path.resolve(options.xt.srcdir, '..', options.xt.maindb + '.backup');

      if (options.xt.maindb) {
        if (fs.existsSync(maindb_path)) {
          files.push({
            file: maindb_path,
            stem: xt.database.maindb.replace('.backup', '')
          });
        }
        else {
          throw new Error('File not found; expected to find '+ maindb_path);
        }
      }

      return {
        backupfiles: files
      };
    }
  });
})();
