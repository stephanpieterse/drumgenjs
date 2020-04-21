#!/bin/bash
set -xe
cd /opt/app/

# lilypond lilypondserver.ly &
bash startlilyserverhealth.sh &

# a long silence audio file to mix in later
# to ensure items are the correct length
sox -n -r 44100 -c 1 /tmp/silence.wav trim 0.0 30.0

if [ "$TEST" == "true" ];
then
  npm run test
  exit $?;
fi

while true;
do
  npm run start
done
