#/bin/bash

WORKDATE=`date "+%m%d%Y"`

DATE=`date`

AWSAZ=`ec2metadata | grep '^availability-zone' | cut -d':' -f2`
AWSIP=`ec2metadata | grep '^local-ipv4' | cut -d':' -f2`

AWSREPORT=ec2east_${WORKDATE}.txt

DBLIST=`psql -At  -p 6432 -U admin pgbouncer -c 'SHOW DATABASES;' | cut -d '|' -f 1`

cat << EOF >> $AWSREPORT
xTuple Database report for ${AWSAZ} on ${AWSIP}.
Generated on $DATE

EOF

for DB in $DBLIST ; do

#IP=`psql -At -E -p 6432 -U admin pgbouncer -c 'SHOW DATABASES;' | grep '^${DB}$' |  cut -d '|' -f 2`
#PORT=`psql -At -E -p 6432 -U admin pgbouncer -c 'SHOW DATABASES;' | grep '^${DB}$' | cut -d '|' -f 3`
#USER=`psql -At -E -p 6432 -U admin pgbouncer -c 'SHOW DATABASES;' | grep '^${DB}$' | cut -d '|' -f 5`
QRY1=`psql -U admin -p 6432 ${DB} -c "SELECT 'Database',CURRENT_DATABASE()  \
UNION ALL SELECT 'Application',metric_value FROM metric WHERE metric_name ='Application' \
UNION ALL SELECT 'Version', metric_value FROM metric WHERE metric_name ='ServerVersion' \
UNION ALL SELECT 'Registration Key', metric_value FROM metric WHERE metric_name ='RegistrationKey' \
UNION ALL SELECT '===Package===','===Package Version===' \
UNION ALL SELECT pkghead_name, pkghead_version FROM pkghead \
UNION ALL SELECT '===UserName | Active===','===Email===' \
UNION ALL SELECT usr_username||' | '||usr_active, COALESCE(usr_email,'N/A') FROM usr;"`

cat << EOF >> $AWSREPORT
----------------------------------------------------------
Report for $DB
----------------------------------------------------------

$QRY1

EOF

done;
cat << EOF >> $AWSREPORT

************
Report Done!
************
EOF

#=====
# Mail
#=====
CNSUB="ec2east report for ${DATE}"
MAILPRGM=/usr/bin/mutt
export EMAIL=ec2east@xtuple.com
#MTO="xtn_backups@xtuple.com"
MTO="pclark@xtuple.com"
MT1="bc@xtuple.com"

$MAILPRGM -s $CNSUB $MTO < $AWSREPORT
$MAILPRGM -s $CNSUB $MT1 < $AWSREPORT

exit 0;
