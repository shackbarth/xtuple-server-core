#!/bin/bash
# Add to crontab
# 59 23 * * * /bin/sh /root/backups.sh >/dev/null

WORKDATE=`date "+%m%d%Y"`

STARTJOB=`date +%T`
# Add each customer job you need to run. These will run in order...
/bin/sh /mnt/backup/backup.sh -h localhost -p 5432 -d divercety -m null -c vercet divercety
/bin/sh /mnt/backup/backup.sh -h localhost -p 5433 -d cavalier_pilot5 -m null -c caval caval
/bin/sh /mnt/backup/backup.sh -h localhost -p 5435 -d aeryon_pilot -m null -c aeryon aeryon

#This is the part that generates the info to update dogfood xtnbu
/bin/bash /mnt/backup/logs/makebackupstats.sh

STOPJOB=`date +%T`

cat << EOF >> /root/backupjobs.log
Backups ran $WORKDATE
Start / Stop Job: $STARTJOB / $STOPJOB

EOF

