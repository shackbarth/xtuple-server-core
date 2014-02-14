#!/bin/bash
[ -z  "$CUSTOMER" ] && { echo "CUSTOMER is not set"; exit -1; }
[ -z  "$BOUNCERINI" ] && { echo "BOUNCERINI is not set"; exit -1; }
[ -z  "$DBNAME" ] && { echo "DBNAME is not set"; exit -1; }
[ -z  "$DBIPADDRESS" ] && { echo "DBIPADDRESS is not set"; exit -1; }
[ -z  "$DBPORT" ] && { echo "DBPORT is not set"; exit -1; }
[ -z  "$DBUSER" ] && { echo "DBUSER is not set"; exit -1; }
[ -z  "$DBPASS" ] && { echo "DBPASS is not set"; exit -1; }


chkbouncer()
{
CHKBOUNCERINI=`grep ${DBNAME} ${BOUNCERINI}`
if [ "$CHKBOUNCERINI" ];
then
echo "${DBNAME} exists in ${BOUNCERINI} as:"
echo "${CHKBOUNCERINI}"
else

cat << EOF >> ${BOUNCERINI}
${DBNAME} = host=${DBIPADDRESS} port=${DBIPORT} dbname=${DBNAME} password=${DBPASS} user=${DBUSER} pool_size=3
EOF

}

