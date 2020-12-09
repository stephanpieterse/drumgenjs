#!/bin/bash
source env-docker.sh
NAME=drumgen-test
cat Dockerfile > Dockerfile.test
cat <<EOF >> Dockerfile.test
RUN cd /opt/app && npm install
#RUN cp /opt/app/config-dev.js /opt/app/config.js
EOF
docker build -f Dockerfile.test -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --rm \
   $DOCKEROPTSFLAGS -ti \
   --user 1000 \
   -e TEST=true --name $NAME $NAME
