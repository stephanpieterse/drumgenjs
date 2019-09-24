#!/bin/bash
source env-docker.sh
NAME=drumgen
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --restart=always \
   $DOCKEROPTSFLAGS -d \
    --name $NAME $NAME
#   -p 127.0.0.1:9051:5061 \
#   -p 172.17.0.1:9051:5061 \
   #-v `pwd`/tmpgen/:/opt/app/tmpgen/ \
   # -v `pwd`/cache/:/opt/app/cache/ \
