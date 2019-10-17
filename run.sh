#!/bin/bash
source env-docker.sh
NAME=drumgen
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --restart=always \
   $DOCKEROPTSFLAGS -d \
    --name $NAME $NAME
