sudo xtuple-server install --xt-name $xtName --xt-version $xtVersion --xt-edition $xtEdition --xt-demo $xtDemo --xt-quickstart $xtQuickstart --xt-maindb $xtMaindb --xt-pilot yes --xt-adminpw $xtAdminpw --nginx-domain $nginxDomain --nginx-inkey $nginxInkey --nginx-incrt $nginxIncrt --nginx-inzip $nginxInzip --pg-slots $pgSlots --pg-capacity $pgCapacity
New xTuple Deployment (install)
* 0 1 0 0 0 1800 0 -
xtName:0::0,1:Account Name
xtVersion:0:4.4.0:0,1:xTuple App Version
xtEdition:9:/etc/webmin/xtuple/editions.menu:0,1:xTuple Edition
xtDemo:7:yes:0,0:Install Demo?
xtQuickstart:7::0,0:Install Quickstart?
xtMaindb:10::0,0:xTuple Main Database File
xtPilot:7::0,0:Also create a pilot?
xtAdminpw:8::0,0:xTuple "admin" Password
nginxDomain:0::0,0:Domain Name
nginxInkey:10::0,0:SSL key (.key)
nginxIncrt:10::0,0:SSL certificate (.crt or .pem)
nginxInzip:10::0,0:SSL Bundle (.zip)
pgCapacity:0:32:0,0:Capacity (slots)
pgSlots:0:1:0,0:Provision
install:16:Install Now:0,1:Ready?
