#!/bin/sh
set -e
cd "$(dirname "$0")"
mkdir -p out
cat p1.html p2.js p3.js p4.js p5.js p6.js > out/index.html
sed -n '/<script>/,/<\/script>/p' out/index.html | sed '1d;$d' > out/check.js
node --check out/check.js
cp out/index.html ../sunleaf/index.html
sed 's/__PREFIX__/sunleaf-main-/' sw.tmpl.js > ../sunleaf/sw.js
echo BUILD_OK
