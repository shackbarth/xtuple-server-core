(function () {
  'use strict';

  /**
   * Create a new nginx site
   */
  var site = exports;

  var os = require('os'),
    exec = require('execSync').exec,
    format = require('string-format'),
    fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    
    // nginx site template file path
    site_template_path = path.resolve(__dirname, 'xtuple-site.template');

  _.extend(site, /** @exports site */ {

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

    /** @override */
    prelude: function (options) {
      // generate sitename
      options.nginx.sitename = 'xtuple-{version}-{name}'.format({
        name: options.xt.name,
        version: String(options.xt.version).replace(/\./g, '')
      });
      // format domain argument
      options.nginx.domain = String(options.nginx.domain.format(options.nginx));
    },

    /**
     * Generate and write nginx conf
     *  - proxy requests to the node server
     *  - auto-redirect http -> https
     *  - set up SSL
     */
    run: function (options) {
      var pg = options.pg,
        sitename = 'xtuple-{version}-{name}'.format({
          name: options.xt.name,
          version: String(options.xt.version).replace(/\./g, '')
        });


      var nginx_site_template = fs.readFileSync(site_template_path),
        nginx_formatter = _.extend({
          version: options.xt.version,
          sitename: sitename,
          hostname: os.hostname(),
          port: parseInt(pg.cluster.port) + 3011,   // XXX magic
          name: options.xt.name,
          params: JSON.stringify(_.extend({
            generated: new Date().valueOf()
          }, options.nginx)),
        }, options.nginx),
        nginx_conf = nginx_site_template.format(nginx_formatter).trim(),
        nginx_conf_path = path.resolve('/etc/nginx/sites-available', sitename),
        nginx_enabled_path = path.resolve('/etc/nginx/sites-enabled', sitename),
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


      return {
        json: options,
        string: nginx_conf
      };
    }
  });

})();
