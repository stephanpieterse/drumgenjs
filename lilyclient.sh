#!/usr/bin/env bash
set -x
# Compile command line arguments into a scheme expression to be passed to the 
# server. The first item in the list is the client's working directory, followed
# by the client's name (so getopt-long will be happy), and then the actual
# arguments.
opts="(lys:compile \"$(pwd)\""
for v in "$@"
do
  # escape double quotes
  opts="$opts \"$(sed 's/"/\\"/g' <<< $v)\""
done
opts="$opts)"

echo $opts >> /tmp/lilypondserver.log

echo "$opts" | nc 127.0.0.1 12321 2>&1 >> /tmp/lilypondserver.log
if (($? == 1)); then
  echo "Could not find lilypond server on port 12321"
  exit 1
fi
