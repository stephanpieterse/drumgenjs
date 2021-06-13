#!/bin/bash
set -xe
cd /opt/app/

while true;
do
  echo 'Restarted' >> /tmp/lilypondserver.log
  echo '--------' >> /tmp/lilypondserver.log
  lilypond lilypondserver.ly 2>&1 >> /tmp/lilypondserver.log
done
