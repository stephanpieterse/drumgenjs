#!/bin/bash
set -x
for i in `seq 1 10000`;
do
	(NUM=$(curl "http://178.62.52.233:9051/convertnum?num="$i) && curl "http://178.62.52.233:9051/image?nometro=true&map=sn&pat="$NUM >> /dev/null) &
	sleep 0.2s;
done
