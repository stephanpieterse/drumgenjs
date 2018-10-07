#!/bin/bash
set -x
cp MainActivityMod.java platforms/android/src/za/co/apollolms/MainActivity.java

cp page.html www/index.html
sed -i '/replaceme/ r www/headsection.html' www/index.html
sed -i '/beforeend/ r www/footsection.html' www/index.html
sed -i -r 's|/static/jquery(.*)|static/jquery\1|g' www/index.html
sed -i -r 's|/static/hammer(.*)|static/hammer\1|g' www/index.html
