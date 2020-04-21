#!/bin/bash
export DOCKEROPTSFLAGS="--cpu-shares=1024 --memory=448mb --memory-swap=448mb --init -e TZ=UTC"
export DOCKERIMAGENAME="drumgen"
