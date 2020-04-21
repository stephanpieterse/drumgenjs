#!/bin/bash
source env-docker.sh
NAME=drumgen-test
cat Dockerfile > Dockerfile.test
cat <<EOF >> Dockerfile.test
RUN apt-get update && apt-get install -y git
RUN cd /opt/app && npm install
EOF
docker build -f Dockerfile.test -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --rm \
   $DOCKEROPTSFLAGS -ti \
   -e TEST=true --name $NAME $NAME
