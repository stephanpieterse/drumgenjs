#!/bin/bash
shopt -s expand_aliases
set -x

cd cordovaimg
bash build.sh
cd ..

source alias.sh
cp ../static/page.html app/page.html
mkdir app/www/static
cp ../static/jquery.js app/www/static/jquery.js
cp ../static/hammer.min.js app/www/static/hammer.min.js
cd app
mine .
cordova build
cp platforms/android/ant-build/MainActivity-debug.apk ../../static/debug.apk
sudo chown stephan ../../static/debug.apk
