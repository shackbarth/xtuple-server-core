var lib = require('xtuple-server-lib'),
  format = require('string-format'),
  exec = require('execSync').exec,
  _ = require('lodash'),
  path = require('path'),
  fs = require('fs');

/**
 * Generate the config.js file
 */
_.extend(exports, lib.task, /** @exports xtuple-server-xt-config */ {

  /** @override */
  beforeTask: function (options) {
    options.xt.port = lib.util.getServerPort(options);
    options.xt.sslport = lib.util.getServerSSLPort(options);
  },

  /** @override */
  executeTask: function (options) {
    exports.writeBuildConfig(options);
    exports.writeRunConfig(options);
  },

  writeRunConfig: function (options) {
    exports.writeConfig(options);
  },

  writeBuildConfig: function (options) {
    // TODO safer clone stringify/parse; circular ref currently
    var buildOptions = _.clone(options);

    buildOptions.xt = _.extend({ }, options.xt, {
      password: options.xt.adminpw,
      configfile: options.xt.buildconfigfile
    });
    buildOptions.xt.config = { };
    buildOptions.xt.testdb = 'xtuple_demo';

    exports.writeConfig(buildOptions);

    exec('chown {xt.name}:{xt.name} {xt.buildconfigfile}'.format(options));
    exec('chmod 700 {xt.buildconfigfile}'.format(options));
  },

  writeConfig: function (options) {
    var xt = options.xt,
      pg = options.pg,
      sample_path = path.resolve(xt.coredir, 'node-datasource/sample_config'),
      sample_config = require(sample_path),
      sample_obj = JSON.parse(JSON.stringify(sample_config)),

      // replace default config.js values
      derived_config_obj = _.extend(sample_obj, {
        processName: 'xt-web-' + options.xt.name,
        datasource: _.extend(sample_config.datasource, {
          name: options.nginx.domain,
          bindAddress: '127.0.0.1',
          keyFile: options.nginx.outkey,
          certFile: options.nginx.outcrt,
          saltFile: options.xt.rand64file,
          encryptionKeyFile: options.xt.key256file,
          hostname: options.nginx.hostname,
          description: options.nginx.sitename,
          port: options.xt.sslport,
          redirectPort: options.xt.port,
          databases: _.pluck(xt.database.list, 'dbname'),
          testDatabase: options.xt.testdb
        }),
        databaseServer: _.extend(sample_config.databaseServer, {
          hostname: options.xt.socketdir, // TODO support remote databases via SSL clientcert auth
          user: 'admin',
          password: undefined,
          port: parseInt(pg.cluster.port)
        })
      }),
      output_conf = lib.util.wrapModule(derived_config_obj);

    fs.writeFileSync(options.xt.configfile, output_conf);
        
    // write salt file
    // XXX QUESTION: is this really a salt, or an actual private key? is it
    // necessary? I am ignorant of its purpose and cannot find docs on it
    if (!fs.existsSync(options.xt.rand64file)) {
      fs.writeFileSync(
        options.xt.rand64file,
        exec('head -c 64 /dev/urandom | base64 | sed "s/[=\\s]//g"').stdout
      );
    }

    // write encryption file if it does not exist
    if (!fs.existsSync(options.xt.key256file)) {
      fs.writeFileSync(
        options.xt.key256file,
        exec('openssl rand 256 -hex').stdout
      );
    }

    _.extend(options.xt.config, {
      string: output_conf,
      json: derived_config_obj
    });
  },

  /** @override */
  afterTask: function (options) {
    exec('chown {xt.name}:{xt.name} {xt.key256file}'.format(options));
    exec('chown {xt.name}:{xt.name} {xt.rand64file}'.format(options));
    exec('chown {xt.name}:{xt.name} {xt.configfile}'.format(options));

    exec('chmod 700 {xt.key256file}'.format(options));
    exec('chmod 700 {xt.rand64file}'.format(options));
    exec('chmod 700 {xt.configfile}'.format(options));
  }
});
