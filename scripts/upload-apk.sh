#!/bin/zsh
# 갤럭시 APK를 깃허브 릴리스에 올린다 (전송량 제한 없음). 가장 최근 릴리스가 내려받기 주소가 된다:
#   https://github.com/ssjjnnn002-cmd/filmchest/releases/latest/download/filmchest.apk (와 apk.json)
# 토큰은 git push 때 쓰는 키체인 값을 그대로 쓴다.
set -e
cd "$(dirname "$0")/.."
REPO=ssjjnnn002-cmd/filmchest
APK=galaxy/build/filmchest.apk
JSON=galaxy/build/apk.json
BUILT=$(python3 -c "import json;print(json.load(open('$JSON'))['built'])")
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p')
H=(-H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json")
REL=$(curl -sf "${H[@]}" https://api.github.com/repos/$REPO/releases -d "{\"tag_name\":\"android-$BUILT\",\"target_commitish\":\"main\",\"name\":\"갤럭시 앱 $(date -r $BUILT '+%Y-%m-%d %H:%M')\",\"make_latest\":\"true\"}")
UP=$(print -r -- "$REL" | python3 -c "import json,sys;print(json.load(sys.stdin)['upload_url'].split('{')[0])")
curl -sf "${H[@]}" -H "Content-Type: application/vnd.android.package-archive" --data-binary @$APK "$UP?name=filmchest.apk" > /dev/null
curl -sf "${H[@]}" -H "Content-Type: application/json" --data-binary @$JSON "$UP?name=apk.json" > /dev/null
echo "✓ 깃허브 릴리스 android-$BUILT 에 올림"
