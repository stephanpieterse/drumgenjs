#!/bin/bash
source env-docker.sh
NAME=drumgen-dev
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --restart=always \
   $DOCKEROPTSFLAGS -d \
   -v `pwd`/config-dev.js:/opt/app/config.js \
   --name $NAME $NAME
