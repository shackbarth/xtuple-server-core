(function () {
  'use strict';

  var format = require('string-format'),
    _ = require('underscore'),
    Service = require('node-linux').Service,
    m = require('mstring'),
    sync = require('sync'),
    fs = require('fs'),
    path = require('path'),

    script_template = m(function () {
    /***
      #!/bin/bash

      node {bin} -c {config}'

    ***/
    });
    

  var config = exports;

  _.extend(config, /** @exports config */ {

    /** @static */
    run: function (options) {
      var bash = script_template.format({
          bin: path.resolve(options.xt.srcdir, 'node-datasource', 'main.js'),
          config: options.xt.serverconfig.config_js
        });

      fs.writeFileSync(path.resolve(options.xt.serverconfig.config_path, 'svc.sh'), bash);
      var svc = new Service({
        name: 'xt',
        description: 'xTuple Node Service',
        script: path.resolve(options.xt.serverconfig.config_path, 'svc.sh'),
        env: [{
          name: 'NODE_ENV',
          value: 'production'
        }]
      });

      svc.on('install', function () {
        svc.start();
      });

      svc.install();
    }
  });
})();
