#!/bin/bash
[ -z  "$CUSTOMER" ] && { echo "CUSTOMER is not set"; exit -1; }
[ -z  "$BOUNCERINI" ] && { echo "BOUNCERINI is not set"; exit -1; }
[ -z  "$DBNAME" ] && { echo "DBNAME is not set"; exit -1; }
[ -z  "$DBIPADDRESS" ] && { echo "DBIPADDRESS is not set"; exit -1; }

chkbouncer()
{
CHKBOUNCERINI=`grep ${DBNAME} ${BOUNCERINI}`
if [ "$CHKBOUNCERINI" ];
then
echo "${DBNAME} exists in ${BOUNCERINI} as:"
echo "${CHKBOUNCERINI}"
else

cat << EOF >> ${BOUNCERINI}
${DBNAME} = host=${DBIPADDRESS} port=${FINDPORT} dbname=${DBNAME} password=${PASS} user=${USER} pool_size=3
EOF

}

writepgbouncer()
{

# Let's try to find their PG Port
FINDCLUSTER=`ssh -i /etc/xtuple/Scripts/ec2-keypair.pem ubuntu@${DBIPADDRESS} pg_lsclusters -h | grep $CUSTOMER`

if [ "$FINDCLUSTER" ];
then
FINDPORT=`ssh -i /etc/xtuple/Scripts/ec2-keypair.pem ubuntu@${DBIPADDRESS} pg_lsclusters -h | grep $CUSTOMER | tr -s " " | cut -d ' ' -f 3`
echo "Found $CUSTOMER db cluster on $DBIPADDRESS on ${FINDPORT}"
echo "searching pgbouncer.ini for a similar entry"
chkbouncer
else
echo "Database for $CUSTOMER doesn't exist on $DBIPADDRESS. Try $OTHER"
# DBIPADDRESS=${OTHER}
# FINDPORT=`ssh -i /etc/xtuple/ec2-keypair.pem ubuntu@${DBIPADDRESS} pg_lsclusters -h | grep $CUSTOMER | tr -s " " | cut -d ' ' -f 3`
writepgbouncer
fi
}
