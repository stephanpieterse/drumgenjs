#!/bin/bash
set -x
for i in `seq 1 10000`;
do
	(NUM=$(curl "https://drumgen.apollolms.co.za/convertnum?num="$i) && curl "https://drumgen.apollolms.co.za/image?nometro=true&map=sn&pat="$NUM >> /dev/null) &
	sleep 0.2s;
done
