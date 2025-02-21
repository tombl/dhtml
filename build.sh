#!/bin/sh

mkdir -p dist

esbuild src/html.js --bundle --minify --format=esm --define:DHTML_PROD=true --mangle-props=^_ --drop:console --drop-labels=DEV |
terser --mangle --compress --module --output dist/html.min.js
printf "min:    %d bytes\n" "$(wc -c <dist/html.min.js)"

gzip --best <dist/html.min.js >dist/html.min.js.gz
printf "gzip:   %d bytes\n" "$(wc -c <dist/html.min.js.gz)"

brotli --best <dist/html.min.js >dist/html.min.js.br
printf "brotli: %d bytes\n" "$(wc -c <dist/html.min.js.br)"
 