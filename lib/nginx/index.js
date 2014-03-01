(function () {
  'use strict';

  var conf = require('nginx-conf').NginxConfFile,
    exec = require('exec-sync'),
    m = require('mstring'),
    Writer = require('simple-file-writer'),
    defaults = require('./defaults'),
    _ = require('underscore');

  if (defaults.env.platform !== 'linux') {
    throw 'Incompatible OS detected';
  }
  if (! /1\.4\.5/.test(exec('nginx -v'))) {
    throw 'Incompatible nginx version detected';
  }

  var nginx_vhost_template = m(function () {
    /***
      upstream xtuplenode {
        server 127.0.0.1:8443;
      }

      # redirect http -> https
      server {
        listen 80;
        return 301 https://$host$request_uri;
      }

      server {
        listen 443;
        ssl on; 
        ssl_certificate /srv/ssl/{pem}
        ssl_certificate_key /srv/ssl/{key}
        # TODO handle signed certs differently?

        server_name localhost;
        access_log /var/log/nginx/localhost.sslaccess.log;
        error_log /var/log/nginx/localhost.sslerror.log;

        root /usr/share/nginx/html;
        index index.html index.htm;
        
        ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
        ssl_ciphers RC4:HIGH:!aNULL:!MD5;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        keepalive_timeout    60; 

        large_client_header_buffers 8 32k;

        location / { 
          proxy_pass https://xtuplenode;
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
        }
      }

    ***/
  });

  var nginx = exports;

  _.extend(nginx, /** @exports nginx */ {

    create: function (options) {
      var nginx_conf = nginx_vhost_template
        .format(options)
        .replace(/^\s+/mg, '')
        .trim();
    }

  });

})();
