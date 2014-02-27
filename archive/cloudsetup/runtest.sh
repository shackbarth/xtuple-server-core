#!/bin/bash
echo 'destroing testnode'

virsh destroy testnode
pushd /var/lib/libvirt/images/testnode
echo 'creating new vm'
cp tmpvu4nbS.qcow2.template tmpvu4nbS.qcow2
popd
virsh start testnode
echo 'waiting for vm to start'
sleep 20
echo 'attempting to connect'
ssh 192.168.0.64 ./install_prod.sh 2>&1 | tee -a /tmp/install.log
#ssh 192.168.0.64 ./test.sh 2>&1 | tee -a /tmp/test.log
