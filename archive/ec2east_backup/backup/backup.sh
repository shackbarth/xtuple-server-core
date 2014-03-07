#!/bin/bash
PROG=`basename $0`

usage() {
  echo "$PROG usage:"
  echo
  echo "$PROG -H"
  echo "$PROG [ -h hostname ] [ -p port ] [ -d database ] [ -m user@company.com ] [ -c CRMACCNTNAME ] companyname"
  echo
  echo "-H      print this help and exit"
  echo "-h      hostname of the database server (default $PGHOST) i.e. myhost.xtuplecloud.com"
  echo "-p      listening port of the database server (default $PGPORT) i.e. 5432"
  echo "-d      name of database i.e. quickstart"
  echo "-m      Notification Email i.e. pclark@xtuple.com"
  echo "-c	CRMACCOUNT Name i.e. xtuple"
  echo " Last value is company name i.e. xtuple or backup name, becomes bak_companyname"
}

ARGS=`getopt Hh:p:d:m:c: $*`

if [ $? != 0 ] ; then
usage
exit 1
fi

set -- $ARGS

while [ "$1" != -- ] ; do
  case "$1" in
    -H)   usage ; exit 0 ;;
    -h)   export PGHOST="$2" ; shift ;;
    -p)   export PGPORT="$2" ; shift ;;
    -d)   export PGDB="$2" ; shift ;;
    -m)   export NOTE="$2" ; shift ;;
    -c)   export CRMACCT="$2" ; shift ;;
    *)    usage ; exit 1 ;;
  esac
  shift
done
shift

if [ $# -lt 1 ] ; then
  echo $PROG: One server to monitor is required
  usage
  exit 1
elif [ $# -gt 1 ] ; then
  echo $PROG: multiple servers named - ignoring more than the first 1
fi

CN="$1"

BACKUPACCT=bak_${CN}
PGBIN=/usr/bin
PGUSER=admin
# PGPORT=5432
# PGHOST=localhost
WORKDATE=`date "+%m%d%Y"`

HOMEDIR=/mnt
BACKUPDIR=$HOMEDIR/backup
ARCHIVEDIR=$BACKUPDIR/archive
LOGDIR=${BACKUPDIR}/logs
LOGFILE="${LOGDIR}/${PGHOST}_BackupStatus_${CN}_${WORKDATE}.log"

#=====
# Mail
#=====
MAILPRGM=/usr/bin/mutt
export EMAIL=backups@xtuple.com
#MTO="xtn_backups@xtuple.com"
MTO="pclark@xtuple.com"
GLOBALFILE=${CN}_${PGHOST}_globals_${WORKDATE}.sql


#==============
# Authentication to CloudFiles
#==============
AUTHUSER=psychocatic22
AUTHAPIKEY=a653fcc5f0530f7f2362616c6dd7a79f
CURL="curl -v -H"

REMOVALLOG="${LOGDIR}/removal.log"
REMOVELIST=`find ${ARCHIVEDIR}/*.backup -mtime +1 -exec ls {} \;`
REMOVELISTSQL=`find ${ARCHIVEDIR}/*.sql -mtime +1 -exec ls {} \;`

cat << EOF >> $REMOVALLOG
========================================
REMOVAL LOG FOR $WORKDATE
========================================
EOF

for REMOVEME in $REMOVELIST ; do
rm -rf $REMOVEME
cat << EOF >> $REMOVALLOG
$REMOVEME Deleted
EOF
done

for REMOVEMESQL in $REMOVELISTSQL ; do
rm -rf $REMOVEMESQL
cat << EOF >> $REMOVALLOG
$REMOVEMESQL Deleted
EOF
done

#==============
# Loop through database names and back them up.
# Make list of databases to backup individually.
#==============
PGDUMPVER=`pg_dump -V`

STARTJOB=`date +%T`

cat << EOF >> $LOGFILE
======================================
Backup Job Started: $WORKDATE $STARTJOB
======================================
EOF

CUSTLIST=`echo "SELECT datname as "dbname" FROM pg_catalog.pg_database \
           WHERE datname IN('${PGDB}') ORDER BY 1;" | \
            $PGBIN/psql -A -t -h $PGHOST -U $PGUSER -p $PGPORT postgres`

for DB in $CUSTLIST ; do

BACKUPFILE=${CN}_${DB}_${WORKDATE}.backup

STARTDBJOB=`date +%T`
$PGBIN/pg_dump --host $PGHOST  --port $PGPORT --username $PGUSER $DB --format custom --blobs --file ${ARCHIVEDIR}/${BACKUPFILE}
STOPDBJOB=`date +%T`


# CHECK TO SEE THE SIZE OF THE FILE IS > 0...
STARTRSJOB=`date +%T`

if [ -s "${ARCHIVEDIR}/${BACKUPFILE}" ]
then
echo "File isn't empty, checking size..."

CHKSIZE=$(wc -c <"${ARCHIVEDIR}/${BACKUPFILE}")
#5GB Limit on RS
CHKLIMIT=5000000000
# CHKLIMIT=4000000
# CHKLIMIT=100000
CHKNUM=`expr $CHKSIZE / $CHKLIMIT`
SPLITDIR=${ARCHIVEDIR}/split
if [ $CHKNUM -lt 1 ]
then
# Do Nothing.
echo "Leaving it alone"
WASSPLIT="FALSE"
else
echo "Fat File... Have to do some work to it..."
WASSPLIT="TRUE"
split -d -b 5GB ${ARCHIVEDIR}/${BACKUPFILE} ${SPLITDIR}/${BACKUPFILE}_
SPLITFILELIST=`ls ${SPLITDIR}/${BACKUPFILE}_*`

MANIFEST=${SPLITDIR}/${CN}_${DB}_${WORKDATE}_manifest

cat << EOF >> ${MANIFEST}
json: [
EOF

for MD5FILE in ${SPLITFILELIST} ; do
SPLITPATH=${MD5FILE}
SPLITETAG=`md5sum ${MD5FILE} | cut -d' ' -f1`
SPLITSIZE=$(wc -c <"${MD5FILE}")
JUSTFILE=`ls $MD5FILE | cut -d'/' -f6`
cat << EOF >> ${MANIFEST}
{"path": "${BACKUPACCT}/${JUSTFILE}",   
         "etag": "$SPLITETAG",   
         "size_bytes": $SPLITSIZE },
EOF
echo "Sending $MD5FILE to Rackspace"
## Sending /root/backup/archive/split/xtuple_ppctest_07172013.backup_00 to Rackspace
# Transfer it to xTuple's Cloud server.  This only works if you're an XTN subscriber
# Establish initial authentication
${CURL} "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1

# Parse storage token to be used as an authentication key
STORAGETOKEN=`curl -v -H "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1 | grep Storage-Token | awk -F'<' '{print $2}' |tr -d '\r' | cut -d ' ' -f 3`
STORAGEURL=`curl -v -H "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1 | grep Storage-Url | awk -F'<' '{print $2}' | tr -d '\r' | cut -d ' ' -f 3`
curl -X PUT -T ${MD5FILE} -H "X-Auth-Token: "${STORAGETOKEN}"" ${STORAGEURL}/${BACKUPACCT}/${JUSTFILE}

done

cat << EOF >> ${MANIFEST}
]
EOF
echo "Sending $MANIFEST to Rackspace"
JUSTMANIFEST=`ls $MANIFEST | cut -d'/' -f6`

### ?multipart-manifest=put
## Sending /root/backup/archive/split/xtuple_ppctest_07172013_manifest to Rackspace
curl -X PUT -T ${MANIFEST} -d "?multipart-manifest=put" -H "X-Auth-Token: "${STORAGETOKEN}"" ${STORAGEURL}/${BACKUPACCT}/${JUSTMANIFEST}

fi
 

# Transfer it to xTuple's Cloud server.  This only works if you're an XTN subscriber
# Establish initial authentication
${CURL} "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1

# Parse storage token to be used as an authentication key
STORAGETOKEN=`curl -v -H "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1 | grep Storage-Token | awk -F'<' '{print $2}' |tr -d '\r' | cut -d ' ' -f 3`
STORAGEURL=`curl -v -H "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1 | grep Storage-Url | awk -F'<' '{print $2}' | tr -d '\r' | cut -d ' ' -f 3`
curl -X PUT -T ${ARCHIVEDIR}/${BACKUPFILE} -H "X-Auth-Token: "${STORAGETOKEN}"" ${STORAGEURL}/${BACKUPACCT}/${BACKUPFILE}

STOPRSJOB=`date +%T`

DBSIZE=`ls -lh ${ARCHIVEDIR}/${BACKUPFILE} | cut -d' ' -f5`

cat << EOF >> $LOGFILE
File: $BACKUPFILE
Size: $DBSIZE
PGVer: $PGDUMPVER
Backup: $STARTDBJOB - $STOPDBJOB
Transfer: $STARTRSJOB - $STOPRSJOB
EOF

else
	echo "${ARCHIVEDIR}/${BACKUPFILE} is empty"
	#Should do something....
cat << EOF >> $LOGFILE
$WORKDATE - Empty $ARCHIVEDIR/$BACKUPFILE - BAD
EOF

fi
done



#==============
# Grab the Globals too
#==============

$PGBIN/pg_dumpall -U $PGUSER -h $PGHOST -p $PGPORT -g > ${ARCHIVEDIR}/${GLOBALFILE}

if [ -s "${ARCHIVEDIR}/${GLOBALFILE}" ]
then
	echo "File isn't empty, transferring..." 
# Transfer it to xTuple's Cloud server.  This only works if you're an XTN subscriber
# Establish initial authentication
${CURL} "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1

# Parse storage token to be used as an authentication key
STORAGETOKEN=`curl -v -H "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1 | grep Storage-Token | awk -F'<' '{print $2}' |tr -d '\r' | cut -d ' ' -f 3`
STORAGEURL=`curl -v -H "X-Auth-User: ${AUTHUSER}" -H "X-Auth-Key: ${AUTHAPIKEY}" https://auth.api.rackspacecloud.com/v1.0 2>&1 | grep Storage-Url | awk -F'<' '{print $2}' | tr -d '\r' | cut -d ' ' -f 3`
curl -X PUT -T ${ARCHIVEDIR}/${GLOBALFILE} -H "X-Auth-Token: "${STORAGETOKEN}"" ${STORAGEURL}/${BACKUPACCT}/${GLOBALFILE}

cat << EOF >> $LOGFILE
Globals: $GLOBALFILE
==================================

EOF

else
	echo "${ARCHIVEDIR}/${GLOBALFILE} is empty"
	#Should do something....
cat << EOF >> BAD_${LOGFILE}
$WORKDATE - Empty Global SQL - BAD
EOF
fi

STOPJOB=`date +%T`
cat << EOF >> $LOGFILE
Job Start / Job Stop: $STARTJOB / $STOPJOB
EOF

CNSUB="${CN}_Mobile_Backup_Ran"

# $MAILPRGM -s $CNSUB $MTO < $LOGFILE
# $MAILPRGM -s $CNSUB $NOTE < $LOGFILE

UPDATEXTNBU=${LOGDIR}/${CN}_${PGDB}_${WORKDATE}.qry

cat << EOF >> $UPDATEXTNBU
CRMACCT~'${CRMACCT}'
STORAGEID~1
CRMACCT_ID~'${CRMID}'
PGHOST~'${PGHOST}'
PGPORT~'${PGPORT}'
PGDB~'${PGDB}'
BACKUPFILE~'${BACKUPFILE}'
PGVER~'${PGDUMPVER}'
STARTJOB~'${STARTDBJOB}'
STOPJOB~'${STOPDBJOB}'
STARTRS~'${STARTRSJOB}'
STOPRS~'${STOPRSJOB}'
DBSIZE~'${DBSIZE}'
STOREURL~'${BACKUPACCT}/${BACKUPFILE}'
WASSPLIT~'$WASSPLIT'
EOF

exit 0;
