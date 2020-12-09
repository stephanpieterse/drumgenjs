#!/bin/bash
source env-docker.sh
NAME=drumgen-dev
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --restart=always \
   $DOCKEROPTSFLAGS -d \
   --user 1000 \
   -v `pwd`/config-dev.js:/opt/app/config.js \
   -v `pwd`/static/manifest-dev.json:/opt/app/static/manifest.json \
   --name $NAME $NAME
