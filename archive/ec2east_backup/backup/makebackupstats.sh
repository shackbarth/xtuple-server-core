#!/bin/bash
WORKDATE=`/bin/date "+%m%d%Y"`
HOSTNAME=ec2east
WORKDIR="/mnt/backup/logs"
ARCHDIR=${WORKDIR}/archive

cd $WORKDIR
QUERYFILES=`ls *.qry`
LOGFILES=`ls *.log`

TARPACK=${ARCHDIR}/${HOSTNAME}_${WORKDATE}.tar
LOGPACK=${ARCHDIR}/${HOSTNAME}_${WORKDATE}_logs.tar

# echo $QUERYFILES

QUERYFILESCNT=( $QUERYFILES )
QUERYITEMCNT=${#QUERYFILESCNT[@]}

# echo $QUERYITEMCNT

if [ $QUERYITEMCNT -gt 0 ]
then
tar -cf $TARPACK $QUERYFILES
tar -czf $LOGPACK $LOGFILES

for FILE in $QUERYFILES ; do
rm $FILE
done


cat << EOF > ${ARCHDIR}/manifest
IPADDR~ec2east.xtuple.com
PORT~10024
SCPDIR~$TARPACK
EOF

for LOGFILE in $LOGFILES ; do
rm $LOGFILE
done


exit 0;

else

exit 0;
fi
