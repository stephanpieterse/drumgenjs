#!/bin/bash
# --mount type=tmpfs,destination=/opt/app/tmpgen,tmpfs-size=50000000 "
export DOCKEROPTSFLAGS="--cpu-shares=1384 --memory=448mb --memory-swap=448mb --init -e TZ=UTC "
export DOCKERIMAGENAME="drumgen"
