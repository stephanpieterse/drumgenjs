#!/bin/bash

for users in `seq 5 5 30`;
do
  siege -c $users -v -t30s -i -f loadtestfile.sh
done
