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
    _ = require('underscore'),
    
    // nginx site template file path
    site_template_path = path.resolve(__dirname, 'xtuple-site.template');

  _.extend(site, task, /** @exports site */ {

    options: {
      domain: {
        optional: '[domain]',
        description: 'The public domain name that will point to this web server',
        value: '{sitename}.localhost'
      },
      locations: {
        optional: '[json map]',
        description: 'location->upstream mappings (json)',
        value: { }
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
    beforeTask: function (options) {
      options.nginx.sitename = 'xtuple-{version}-{name}'.format({
        name: options.xt.name,
        version: String(options.xt.version).replace(/\./g, '')
      });
      options.nginx.domain = String(options.nginx.domain.format(options.nginx));
      options.nginx.port = require('../xt').serverconfig.getServerPort(options);
      options.hostname = os.hostname();
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
    }
  });

})();
