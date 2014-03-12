(function () {
  'use strict';

  var os = require('os'),
    exec = require('execSync').exec,
    format = require('string-format'),
    fs = require('fs'),
    path = require('path'),
    m = require('mstring'),
    _ = require('underscore');
  /*
        #proxy_cache_path  /var/lib/nginx/cache/{sitename}-static
          #levels=1
          #max_size=16m
          #inactive=1w
          #key_zone={sitename}-static:128k;

        #proxy_cache_path  /var/lib/nginx/cache/{sitename}-ormcache
          #levels=1
          #max_size=8m
          #inactive=1d
          #key_zone={sitename}-ormcache:128k;

        #proxy_cache_path  /var/lib/nginx/cache/{sitename}-rest
          #levels=1
          #max_size=64m
          #inactive=15m
          #key_zone={sitename}-rest:1m;
  */


  var nginx_vhost_template = m(function () {
      /***
        #{params}

        upstream node-{sitename} {
          server 127.0.0.1:{port};
        }

        # auto redirect http -> https
        server {
          listen 80;
          return 301 https://$host$request_uri;
        }

        server {
          listen 443;
          ssl on; 
          ssl_certificate /srv/ssl/{domain}.crt;
          ssl_certificate_key /srv/ssl/{domain}.key;
          # TODO handle signed certs differently?

          server_name {domain}
                      {sitename}.{hostname}
                      ;

          access_log /var/log/nginx/{domain}.access.log;
          error_log /var/log/nginx/{domain}.error.log;

          root /usr/share/nginx/html;
          index index.html index.htm;
          
          ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
          ssl_ciphers RC4:HIGH:!aNULL:!MD5;
          ssl_session_cache shared:SSL:60m;
          ssl_session_timeout 60m;

          large_client_header_buffers 8 64k;

          location / { 
            proxy_pass https://node-{sitename};
            proxy_redirect off;
            proxy_set_header X-NginX-Proxy true;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # for socket.io
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            #error_page 502 = @handle_node_down;
          }

          # 502 gateway error, the upstream node service is likely down
          location @handle_node_down {
            # show a nice picture of a bunny or something
          }
        }

      ***/
    }),
    etc_hosts_template = m(function () {
      /***

      # host mappings for: domain={name}
      127.0.0.1 {sitename}.{hostname}
      127.0.0.1 {domain}

      ***/
    });

  var nginx = exports;

  _.extend(nginx, /** @exports config */ {

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

      var nginx_formatter = _.extend({
          version: options.xt.version,
          sitename: sitename,
          hostname: os.hostname(),
          port: parseInt(pg.cluster.port) + 3011,   // XXX magic
          name: pg.name,
          params: JSON.stringify(_.extend({
            generated: new Date().valueOf()
          }, options.nginx)),
        }, options.nginx),
        nginx_conf = nginx_vhost_template.format(nginx_formatter).trim(),
        nginx_conf_path = path.resolve('/etc/nginx/sites-available', sitename),
        nginx_enabled_path = path.resolve('/etc/nginx/sites-enabled', sitename),
        etc_hosts_current;

      // replace any existing configs
      // TODO warn about this in logs
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
      if (new RegExp('domain=' + pg.name).test(etc_hosts_current)) {
        // TODO log this event
      }
      else {
        fs.appendFileSync(
          path.resolve('/etc/hosts'),
          etc_hosts_template.format(nginx_formatter)
        );
      }

      return {
        json: options,
        string: nginx_conf
      };
    }
  });
})();
