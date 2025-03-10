#!/bin/sh

mkdir -p dist

build() {
    esbuild src/$1.js --bundle --minify --format=esm --define:DHTML_PROD=true --mangle-props=^_ --drop:console --drop-labels=DEV |
    terser --mangle --compress --module --output dist/$1.min.js
    printf "min:    %d bytes\n" "$(wc -c <dist/$1.min.js)"

    gzip --best <dist/$1.min.js >dist/$1.min.js.gz
    printf "gzip:   %d bytes\n" "$(wc -c <dist/$1.min.js.gz)"

    brotli --best <dist/$1.min.js >dist/$1.min.js.br
    printf "brotli: %d bytes\n" "$(wc -c <dist/$1.min.js.br)"
}

build html
build html.server
