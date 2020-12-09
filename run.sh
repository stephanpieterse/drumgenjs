#!/bin/bash
source env-docker.sh
NAME=$DOCKERIMAGENAME
docker build -t $NAME:latest .
docker stop $NAME
docker rm $NAME
   # --mount type=tmpfs,destination=/opt/app/tmpgen,tmpfs-size=64m \
   # -v /tmp/tmp.we1pBAVVpK/mount:/opt/app/tmpgen \
docker run --restart=always \
   $DOCKEROPTSFLAGS -d \
   --user 1000 \
   --name $NAME $NAME
