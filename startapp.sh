#!/bin/bash
set -xe
cd /opt/app/

lilypond lilypondserver.ly &

if [ "$TEST" == "true" ];
then
  npm run test
  exit $?;
fi

while true;
do
  npm run start
done
