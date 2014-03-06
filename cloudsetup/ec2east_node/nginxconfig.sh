#!/bin/bash
# first 8 digits of md5sum of FAILURE
[ -z  "$NODEREDIRECTPORT" ] && { echo " nginxconfig NODEREDIRECTPORT is not set f2fa2ea3"; exit -1; }
[ -z  "$NODEPORT" ] && { echo "NODEPORT is not set f2fa2ea3"; exit -1; }
[ -z  "$CUSTOMER" ] && { echo "CUSTOMER is not set f2fa2ea3"; exit -1; }
	
# PORT is the the HTTP port it is simply there to redirect
PORT=${NODEREDIRECTPORT}
# PORTSSL is the HTTPS port it is the real port
PORTSSL=${NODEPORT}
# Port 10080
# portssl 10443

# Don't change, unless you know...
SITEAVAIL=/etc/nginx/sites-available
SITEENABLE=/etc/nginx/sites-enabled
IPV4LOCAL=`ec2metadata --local-ipv4`

#This script writes out the nginx config.
chknginxservice()
{
if [ ! -f ${SITEAVAIL}/${CUSTOMER} ]
then
#first 8 digits of md5sum of SUCCESS
echo " Nginx Config: ${SITEAVAIL}/${CUSTOMER} does not exist. Creating. e9b4c3b4"
writenginxconfig
else
#first 8 digits of md5sum of EXISTS
echo "Nginx Config: ${SITEAVAIL}/${CUSTOMER} already exists. Skipping bcb3b227"

fi
}


writenginxconfig()
{
cat << EOF > $SITEAVAIL/${CUSTOMER}
upstream ${CUSTOMER} {
	server 127.0.0.1:${PORT};
}
upstream ${CUSTOMER}ssl {
	server 127.0.0.1:${PORTSSL};
}
server {
	listen ${IPV4LOCAL}:80; 
	server_name ${CUSTOMER}.xtuple.com;
	access_log /var/log/nginx/${CUSTOMER}.xtuple.com.access.log cache;
	error_log /var/log/nginx/${CUSTOMER}.xtuple.com.error.log;
	root /usr/share/nginx/html;
	index index.html index.htm;
	
	location / {
		proxy_pass http://${CUSTOMER};

		proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
		proxy_redirect off;
		proxy_buffering off;
		proxy_http_version 1.1;

		proxy_set_header Upgrade \$http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;

	}
}

server {
	listen ${IPV4LOCAL}:443;
	ssl on;
	ssl_certificate	/etc/ssl/certs/wildcard.bundle.crt;
	ssl_certificate_key /etc/ssl/private/wildcard.xtuple.com.key;
	ssl_verify_depth 3;
	

	server_name ${CUSTOMER}.xtuple.com;
	access_log /var/log/nginx/${CUSTOMER}.xtuple.com.sslaccess.log cache;
	error_log /var/log/nginx/${CUSTOMER}.xtuple.com.sslerror.log;

	root /usr/share/nginx/html;
	index index.html index.htm;
	
	ssl_protocols	SSLv3 TLSv1 TLSv1.1 TLSv1.2;
	ssl_ciphers RC4:HIGH:!aNULL:!MD5;
	ssl_session_cache shared:SSL:10m;
	ssl_session_timeout 10m;
	keepalive_timeout    60;

	location / {
		proxy_pass https://${CUSTOMER}ssl;
		proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
		proxy_redirect off;
		proxy_buffering on;
		proxy_buffers 8 8k;
		proxy_http_version 1.1;
		proxy_set_header Upgrade \$http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
		proxy_cache off; 
		proxy_cache_valid 200 302 60m;
		proxy_cache_valid 404 1m;
		proxy_ignore_headers "Set-Cookie";
		proxy_set_header        X-Forwarded-Proto \$scheme;
		add_header      Front-End-Https   on;
		### By default we don't want to redirect it ####
	        proxy_redirect     off;
	}
}
EOF
cd $SITEENABLE && ln -s $SITEAVAIL/${CUSTOMER} .
}
chknginxservice
