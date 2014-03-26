(function () {
  'use strict';

  /**
   * Create a new nginx site
   */
  var configure = exports;

  var os = require('os'),
    exec = require('execSync').exec,
    format = require('string-format'),
    fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    
    // nginx site template file path
    site_template_path = path.resolve(__dirname, 'xtuple-site.template');

/*
    etc_hosts_template = m(function () {

      # host mappings for: domain={name}
      127.0.0.1 {sitename}.{hostname}
      127.0.0.1 {domain}

    });
    */

  _.extend(configure, /** @exports configure */ {

    options: {
      domain: {
        optional: '[domain]',
        description: 'The public domain name that will point to this web server',
        value: '{sitename}.localhost'
      }
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
          name: pg.name,
          version: String(options.xt.version).replace(/\./g, '')
        });

      // format domain argument
      options.nginx.domain = String(options.nginx.domain.format({ sitename: sitename }));

      var nginx_site_template = fs.readFileSync(site_template_path),
        nginx_formatter = _.extend({
          version: options.xt.version,
          sitename: sitename,
          hostname: os.hostname(),
          port: parseInt(pg.cluster.port) + 3011,   // XXX magic
          name: pg.name,
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

      // TODO move the /etc/hosts stuff to a separate module
      // update system hosts file
      etc_hosts_current = fs.readFileSync(path.resolve('/etc/hosts'));

      // if hosts file already contains this entry, do not add a duplicate
      /*
      if (new RegExp('domain=' + pg.name).test(etc_hosts_current)) {
        // TODO log this event
      }
      else {
        fs.appendFileSync(
          path.resolve('/etc/hosts'),
          etc_hosts_template.format(nginx_formatter)
        );
      }
      */

      return {
        json: options,
        string: nginx_conf
      };
    }
  });

})();
