(function () {
  'use strict';

  /**
   * Create a new nginx site
   */
  var site = exports;

  var task = require('../../lib/task'),
    os = require('os'),
    exec = require('execSync').exec,
    format = require('string-format'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    
    // nginx site template file path
    site_template_path = path.resolve(__dirname, 'xtuple-site.template');

  _.extend(site, task, /** @exports site */ {

    options: {
      domain: {
        optional: '[domain]',
        description: 'The public domain name that will point to this web server',
        value: 'localhost'
      }
    },

    /**
     * Integer offset from the Postgres cluster port that this site connects
     * to; used to assign the port that the nginx upstream server will listen
     * on.
    portOffset: 3011,

    /**
     * Generate 'sitename' value and format the domain argument if necessary
     * @override
     */
    beforeInstall: function (options) {
      options.nginx.sitename = 'xt-{version}-{name}'.format({
        name: options.xt.name,
        version: site.getScalarVersion(options)
      });
      options.nginx.hostname = '{nginx.sitename}.localhost'.format(options);
      if (options.nginx.domain === 'localhost') {
        options.nginx.domain = options.nginx.hostname;
      }
      options.nginx.healthfeedurl = '{nginx.domain}/_healthfeed'.format(options);
      options.nginx.lanEndpoints = (options.pg.mode === 'dedicated') && [
        '       localhost',
        '       (^127\\.0\\.0\\.1)',
        '       (^10\\.)',
        '       (^172\\.1[6-9]\\.)',
        '       (^172\\.2[0-9]\\.)',
        '       (^172\\.3[0-1]\\.)',
        '       (^192\\.168\\.)'
      ].join('\n') || '';
    },

    /** @override */
    beforeTask: function (options) {
      options.nginx.port = require('../xt').serverconfig.getServerSSLPort(options);
      options.nginx.healthfeedport = options.nginx.port + 5984;
    },

    /**
     * Generate and write nginx conf
     *  - proxy requests to the node server
     *  - auto-redirect http -> https
     *  - set up SSL
     *  @override
     */
    doTask: function (options) {
      var pg = options.pg,
        nginx_site_template = fs.readFileSync(site_template_path).toString(),
        nginx_conf = nginx_site_template.format(options).trim(),
        nginx_conf_path = path.resolve('/etc/nginx/sites-available', options.nginx.sitename),
        nginx_enabled_path = path.resolve('/etc/nginx/sites-enabled', options.nginx.sitename),
        nginx_default_enabled = path.resolve('/etc/nginx/sites-enabled', 'default'),
        nginx_default_available = path.resolve('/etc/nginx/sites-available', 'default'),
        etc_hosts_current;

      // replace any existing configs
      // TODO warn about this in logs
      exec('rm -f {enabled}'.format({ enabled: nginx_default_enabled }));
      exec('rm -f {available}'.format({ available: nginx_default_available }));

      exec('rm -f {enabled}'.format({ enabled: nginx_enabled_path }));
      exec('rm -f {available}'.format({ available: nginx_conf_path }));

      // remove the default config, if it exists. we have no use for this
      // TODO exec('rm -f {default}'.format({ default: path.resolve(nginx_conf_path, 'default') }));

      // write nginx site config file
      fs.writeFileSync(nginx_conf_path, nginx_conf);

      exec('ln -s {available} {enabled}'.format({
        available: nginx_conf_path,
        enabled: nginx_enabled_path
      }));

      _.defaults(options.nginx.site, {
        json: options,
        string: nginx_conf
      });
    },

    /**
     * Return a version with no dots, which makes more sense when used in a URL
     * or a database name than having punctuation.
     */
    getScalarVersion: function (options) {
      return String(options.xt.version).replace(/\./g, '');
    }
  });

})();
