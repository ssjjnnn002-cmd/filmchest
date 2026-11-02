#!/bin/zsh
# 갤럭시용 필름함 앱(Expo)을 서명해 galaxy/build/filmchest.apk 로 만들고, 웹 배포에 실리도록 web/public/apk/ 에 나눠 둔다.
# 웹 주소 /filmchest.apk 가 조각을 이어 붙여 내보낸다 (web/functions/filmchest.apk.js). 웹을 배포해야 갤럭시에서 보인다.
# 서명 키: ~/tools/filmchest.keystore (비밀번호 ~/tools/filmchest-keystore-password.txt). 잃어버리면 기존 앱 위에 업데이트 설치가 안 된다.
set -e
cd "$(dirname "$0")/.."
export JAVA_HOME=$(ls -d ~/tools/jdk-17*)/Contents/Home
export ANDROID_HOME=~/tools/android-sdk
BT=$ANDROID_HOME/build-tools/36.0.0
# 이 빌드 시각을 앱과 릴리스(apk.json)에 적어 두면 갤럭시 설정의 '업데이트 확인'이 새 버전을 알아본다
BUILT=$(date +%s)
printf '// 자동 생성: scripts/build-android.sh가 APK를 만들 때 시각을 적는다. 여기서 고치지 말 것.\nexport const APK_BUILT = %s\n' "$BUILT" > galaxy/src/apkBuild.ts
(cd galaxy/android && ./gradlew :app:assembleRelease --no-daemon -q)
cp galaxy/android/app/build/outputs/apk/release/app-release.apk /tmp/filmchest-fat.apk
zip -d /tmp/filmchest-fat.apk 'lib/armeabi-v7a/*' 'lib/x86/*' 'lib/x86_64/*' || true
$BT/zipalign -f -p 4 /tmp/filmchest-fat.apk /tmp/filmchest-aligned.apk
export KSP=$(cat ~/tools/filmchest-keystore-password.txt)
$BT/apksigner sign --ks ~/tools/filmchest.keystore --ks-key-alias filmchest --ks-pass env:KSP --key-pass env:KSP \
  --out galaxy/build/filmchest.apk /tmp/filmchest-aligned.apk
rm -f galaxy/build/filmchest.apk.idsig
printf '{"built": %s}\n' "$BUILT" > galaxy/build/apk.json
echo "✓ galaxy/build/filmchest.apk"
# Cloudflare Pages는 파일 하나에 25MB까지라 20MB씩 나눈다
rm -rf web/public/apk && mkdir -p web/public/apk
split -b 20m -a 1 -d galaxy/build/filmchest.apk web/public/apk/part
for f in web/public/apk/part?; do mv "$f" "$f.bin"; done
PARTS=$(ls web/public/apk/part*.bin | wc -l | tr -d ' ')
SIZE=$(stat -f%z galaxy/build/filmchest.apk)
printf '{"parts": %s, "size": %s}\n' "$PARTS" "$SIZE" > web/public/apk/parts.json
cp galaxy/build/apk.json web/public/apk.json
echo "✓ web/public/apk/ ($PARTS 조각) — 웹을 배포하면 올라가요"
