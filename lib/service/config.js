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
    description     "xTuple Server [pg_cluster={name}]

    start on filesystem or runlevel [2345]
    stop on runlevel [!2345]

    console output

    respawn

    exec {bin} -c {config} >> {logfile}

    ***/
    });
    

  var config = exports;

  _.extend(config, /** @exports config */ {

    /** @static */
    run: function (options) {
      /*
      var bash_script = script_template.format({
          bin: path.resolve(options.xt.srcdir, 'node-datasource', 'main.js'),
          config: options.xt.serverconfig.config_js,
          logfile: path.resolve(options.xt.serverconfig.log_path, 'node.log')
        }),
        svc_path = path.resolve('/etc/init/
      // XXX
      // this is rigid and would only support one installation per machine as
      // it stands.
      // TODO improve

      fs.writeFileSync(path.resolve(options.xt.serverconfig.config_path, 'svc.sh'), bash);
      */
    }

  });
})();
