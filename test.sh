#!/bin/bash
NAME=drumgen-test
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
docker run --rm \
   --cpu-shares=800 --memory=512mb --memory-swap=786mb -ti \
   -e TEST=true --name $NAME $NAME
