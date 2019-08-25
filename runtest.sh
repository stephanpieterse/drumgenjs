#!/bin/bash
source env-docker.sh
NAME=drumgen-test
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --rm \
   $DOCKEROPTSFLAGS -ti \
   -e TEST=true --name $NAME $NAME
