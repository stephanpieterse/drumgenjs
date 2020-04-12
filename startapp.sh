#!/bin/bash
set -xe
cd /opt/app/

# lilypond lilypondserver.ly &
bash startlilyserverhealth.sh &

if [ "$TEST" == "true" ];
then
  npm run test
  exit $?;
fi

while true;
do
  npm run start
done
