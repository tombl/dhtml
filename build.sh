#!/bin/sh

mkdir -p dist

dev() {
    esbuild src/$1.ts --bundle --format=esm --define:DHTML_PROD=false --outfile=dist/$1.js
}

prod() {
    esbuild src/$1.ts --bundle --minify --format=esm --define:DHTML_PROD=true --mangle-props=^_ --drop:console --drop-labels=DEV |
    terser --mangle --compress --module --output dist/$1.min.js
    printf "min:    %d bytes\n" "$(wc -c <dist/$1.min.js)"

    gzip --best <dist/$1.min.js >dist/$1.min.js.gz
    printf "gzip:   %d bytes\n" "$(wc -c <dist/$1.min.js.gz)"

    brotli --best <dist/$1.min.js >dist/$1.min.js.br
    printf "brotli: %d bytes\n" "$(wc -c <dist/$1.min.js.br)"
}

dev client
dev server

prod client
prod server
