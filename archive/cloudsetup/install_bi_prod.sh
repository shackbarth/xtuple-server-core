#!/bin/sh
RUN_DIR=$(pwd)
LOG_FILE=$RUN_DIR/install_bi.log
mv $LOG_FILE $LOG_FILE.old
log() {
	echo $@
	echo $@ >> $LOG_FILE
}

varlog() {
	log $(eval "echo $1 = \$$1")
}

cdir() {
	cd $1
	log "Changing directory to $1"
}

RUNALL=true
BI_DIR=$RUN_DIR/../../bi
PRIVATE_DIR=$RUN_DIR/../../private-extensions
XT_DIR=$RUN_DIR/..
export BISERVER_HOME=$RUN_DIR/../../ErpBI
DATABASE=dev
TENANT=default
COMMONNAME=$(hostname)

while getopts ":iebcpd:t:n:j:" opt; do
  case $opt in
    e)
      # Install ErpBI and configure
      RUNALL=
      DOWNLOAD=true
      ;;
    b)
      # Build BI solution and Reports and install
      RUNALL=
      RUN=true
      ;;
    c)
      # Create erpbi database and load tenant data
      RUNALL=
      CONFIGURE=true
      ;;
    p)
      # Prep the Mobile Client to connect to BI Server
      RUNALL=
      PREP=true
      ;;
    d)
      # Set database name to extract
      DATABASE=$OPTARG
	  echo $DATABASE
      ;;
    t)
      # Set tenant name
      TENANT=$OPTARG
	  echo $TENANT
      ;;
    n)
      # Common name for self signed SSL certificate
      COMMONNAME=$OPTARG
	  echo $COMMONNAME
      ;;
    j)
      # Java home
      export JAVA_HOME=$OPTARG
	  echo $JAVA_HOME
      ;; 
    \?)
      log "Invalid option: -"$OPTARG
      exit 1
      ;;
    :)
      log "Option -"$OPTARG" requires an argument."
      exit 1
      ;;
  esac
done

if [ $RUNALL ]
then
	DOWNLOAD=true
	RUN=true
	CONFIGURE=true
	PREP=true
fi

if  ! test -d $BI_DIR ;
then
	log ""
	log "#############################################################"
	log "#############################################################"
    log "Sorry bi folder not found.  You must clone xtuple/bi"
	log "#############################################################"
	log "#############################################################"
	log ""
    exit 1
fi

if  ! test -d $PRIVATE_DIR ;
then
	log ""
	log "####################################################################################"
	log "####################################################################################"
    log "Sorry private-extensions folder not found.  You must clone xtuple/private-extensions"
	log "####################################################################################"
	log "####################################################################################"
	log ""
    exit 1
fi

install_packages () {
	log ""
	log "######################################################"
	log "######################################################"
	log "Install prereqs."
	log "######################################################"
	log "######################################################"
	log ""
	apt-get install -qy git openjdk-6-jdk maven2
	export JAVA_HOME=$(readlink -f /usr/bin/javac | sed "s:bin/javac::")	
	if  ! test -e $JAVA_HOME/bin/javac ;
	then
		log ""
		log "#############################################################"
		log "#############################################################"
		log "Sorry can not find javac.  Set Java Home with the -j argument"
		log "#############################################################"
		log "#############################################################"
		log ""
		exit 1
	fi
}

download_files () {
	log ""
	log "######################################################"
	log "######################################################"
	log "Download ErpBI, set permissions and generate keystore "
	log "and truststore for SSL with self signed cert using    "
	log "common name "$COMMONNAME
	log "######################################################"
	log "######################################################"
	log ""
    cdir $RUN_DIR/../..
	rm -R ErpBI
	rm ErpBI.zip
	wget http://sourceforge.net/projects/erpbi/files/candidate-release/ErpBI.zip/download -O ErpBI.zip
	unzip ErpBI.zip  
	
	cdir $BISERVER_HOME/biserver-ce/
	chmod 755 -R . 2>&1 | tee -a $LOG_FILE
	if [ ! -d '/etc/xtuple/ssl-keys' ] 
	then
		mkdir -p /etc/xtuple/ssl-keys
	fi
	if [ ! -f '/etc/xtuple/ssl-keys/keystore_server.jks' ] 
        then
	
	  cdir /etc/xtuple/ssl-keys
	  keytool -genkey -alias tomcat -keyalg RSA -keypass changeit -storepass changeit -keystore keystore_server.jks -dname "cn="$COMMONNAME", ou=xTuple, o=xTuple, c=US"
	  keytool -export -alias tomcat -file server.cer -storepass changeit -keystore keystore_server.jks
	  keytool -import -alias tomcat -v -trustcacerts -file server.cer -keypass changeit -storepass changeit -keystore cacerts.jks -noprompt
	fi
	cdir $BISERVER_HOME/biserver-ce/tomcat/conf
	cp server.xml server.xml.template
	#change the diretory to /etc/xuple and get rid of the CR
	
	cat server.xml.template | tr -d '\015' | sed -e s#keystoreFile=.*#keystoreFile=\'/etc/xtuple/ssl-keys/keystore_server.jks\'#\
	 -e s#truststoreFile=.*#truststoreFile=\'/etc/xtuple/ssl-keys/cacerts.jks\'#\
	>server.xml 2>&1 | tee -a $LOG_FILE 
	
	cdir $BISERVER_HOME/biserver-ce/tomcat/conf/Catalina/localhost
	mv pentaho.xml pentaho.xml.sample
	cat pentaho.xml.sample | \
	sed -e s/org.h2.Driver/org.postgresql.Driver/  \
	-e s#jdbc:h2:../../../h2database/erpbi#jdbc:postgresql://localhost:5432/erpbi# \
	> pentaho.xml  2>&1 | tee -a $LOG_FILE
}

run_scripts() {
	log ""
	log "######################################################"
	log "######################################################"
	log "Build BI solution and reports and move to ErpBI at:   "
	log $BISERVER_HOME
	log "######################################################"
	log "######################################################"
	log ""
	cdir $BI_DIR/olap-schema
	mvn install 2>&1 | tee -a $LOG_FILE
	java -jar Saxon-HE-9.4.jar -s:src/erpi-sogl-tenant-xtuple.xml -xsl:style.xsl -o:target/erpi-schema.xml
	mvn process-resources 2>&1 | tee -a $LOG_FILE

	cdir ../pentaho-extensions/oauthsso
	mvn clean 2>&1 | tee -a $LOG_FILE
	mvn install 2>&1 | tee -a $LOG_FILE
	mvn process-resources 2>&1 | tee -a $LOG_FILE

	cdir ../dynschema
	mvn install 2>&1 | tee -a $LOG_FILE
	mvn process-resources 2>&1 | tee -a $LOG_FILE

	cdir ../../etl
	mvn install 2>&1 | tee -a $LOG_FILE
	mvn process-resources 2>&1 | tee -a $LOG_FILE
	
	cdir $XT_DIR/pentaho/report-datasource
	sh build.sh  2>&1 | tee -a $LOG_FILE
}

configure_pentaho() {
	log ""
	log "######################################################"
	log "######################################################"
	log "Create datamart database erpbi.  Extract data from dev"
	log "and load data into tenant default.dev".
	log "######################################################"
	log "######################################################"
	log ""
	createdb -U postgres -O admin erpbi 2>&1 | tee -a $LOG_FILE
	cdir $BISERVER_HOME/data-integration
	export KETTLE_HOME=properties/psg-linux
	
	mv $KETTLE_HOME/.kettle/kettle.properties $KETTLE_HOME/.kettle/kettle.properties.sample  2>&1 | tee -a $LOG_FILE
	cat $KETTLE_HOME/.kettle/kettle.properties.sample | \
	sed -e s'#erpi.source.url=.*#erpi.source.url=jdbc\:postgresql\://'$DB_HOST'\:5432/'$SOURCE_DB'#'  \
	-e s'#erpi.source.password=.*#erpi.source.password='$DB_PASSWORD'#' \
	-e s'#erpi.tenant.id=.*#erpi.tenant.id='$TENANT'.'$DATABASE'#' \
	> $KETTLE_HOME/.kettle/kettle.properties  2>&1 | tee -a $LOG_FILE
	
	sh kitchenkh.sh -file=../ErpBI/ETL/JOBS/Load.kjb -level=Basic
}

prep_mobile() {
	log ""
	log "######################################################"
	log "######################################################"
	log "Prepare mobile app to use the BI Server. Create keys  "
    log "for REST api used by single sign on.  Update config.js"
    log "with BI Server URL https://"$COMMONNAME":8443"
	log "######################################################"
	log "######################################################"
	log ""
	if [ ! -d '/etc/xtuple/lib/rest-keys' ]
	then
	  mkdir -p /etc/xtuple/lib/rest-keys
	fi
	cdir /etc/xtuple/lib/rest-keys
	openssl genrsa -out server.key 1024 2>&1 | tee -a $LOG_FILE
	openssl rsa -in server.key -pubout > server.pub 2>&1 | tee -a $LOG_FILE
	
	#
	# Would be better to get multiline sed working to put commonname in:
	# biserver: {
	#    hostname: myname
	#
	# Something similar to:
	#	sed 'N;s#biServer: {\n        hostname:.*#biServer: {\n        hostname: \"'$COMMONNAME'\",#' \
	
	cdir $XT_DIR/node-datasource
	mv config.js config.js.old 2>&1 | tee -a $LOG_FILE
	cat config.js.old | \
	sed -e 's#biKeyFile: .*#biKeyFile: \"./lib/rest-keys/server.key\",#'  \
	-e 's#biServerUrl: .*#biServerUrl: \"https://'$COMMONNAME':8443/pentaho/\",#' \
	-e 's#uniqueTenantId: .*#uniqueTenantId: \"'$TENANT'",#'  \
	-e  's#biUrl: .*#biUrl: \"https://'$COMMONNAME':8443/pentaho/content/reporting/reportviewer/report.html\?solution=xtuple\&path=%2Fprpt\&locale=en_US\&userid=reports\&password=password\&output-target=pageable/pdf\",#'  \
	-e  's#biserverhostname#'$COMMONNAME'#' \
	> config.js
}

install_packages

if [ $? -ne 0 ]
then
	log "bad."
fi

if [ $DOWNLOAD ]
then
	download_files
fi

if [ $RUN ]
then
	run_scripts
fi

if [ $CONFIGURE ]
then
	configure_pentaho
fi

if [ $PREP ]
then
	prep_mobile
fi

log ""
log "######################################################"
log "######################################################"
log "                FINISHED! READ ME                      "
log "If you use the self signed certificate created by this"
log "script you will need to accept the certificate in your"
log "browser.  Use one of the Print buttons in the Mobile  "
log "Web Client to accept the certificate."
log ""
log "If reports were installed or updated you will need to "
log "refresh the BI Server repository cache:               "
log "  Connect to https://"$COMMONNAME":8443"
log "  login as user:admin, password:Car54WhereRU"
log "  tools > Refresh > Repository Cache"
log "  tools > Refresh > Reporting Metadata"
log "  tools > Refresh > Reporting Data Cache"
log "######################################################"
log "######################################################"
log ""
