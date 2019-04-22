#!/bin/bash
NAME=drumgen
bash cleartmpgen.sh
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --restart=always \
   --cpu-shares=900 --memory=256mb --memory-swap=512mb -d \
   -p 127.0.0.1:9051:5061 \
   -v `pwd`/cache/:/opt/app/cache/ \
   -v `pwd`/tmpgen/:/opt/app/tmpgen/ \
    --name $NAME $NAME
