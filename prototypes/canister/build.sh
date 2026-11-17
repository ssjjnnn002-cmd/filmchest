#!/bin/zsh
# 필름통 시안 페이지 다시 만들기: zsh prototypes/canister/build.sh
cd "$(dirname "$0")/../../web"
npx esbuild ../prototypes/canister/entry.ts --bundle --format=iife --outfile=../prototypes/canister/bundle.js --log-level=error
cd ../prototypes/canister
python3 -c "
s=open('page.html').read(); b=open('bundle.js').read().replace('</script','<\\\\/script')
open('index.html','w').write(s.replace('/*BUNDLE*/',b))"
rm bundle.js
