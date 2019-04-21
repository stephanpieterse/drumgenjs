#!/bin/bash
set -xe
cd /opt/app/

lilypond lilypondserver.ly &

while true;
do
  npm run start
done
