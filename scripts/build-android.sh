#!/bin/zsh
# 갤럭시용 필름함 앱(Expo)을 서명해 깃허브 릴리스(android)에 올린다.
# APK는 Vercel에 두지 않는다 (용량이 커서 무료 플랜 전송량 100GB를 넘겨 사이트가 멈췄다).
# 올리려면 gh 로그인이 필요하다: brew install gh && gh auth login
# 서명 키: ~/tools/filmchest.keystore (비밀번호 ~/tools/filmchest-keystore-password.txt). 잃어버리면 기존 앱 위에 업데이트 설치가 안 된다.
set -e
cd "$(dirname "$0")/.."
export JAVA_HOME=$(ls -d ~/tools/jdk-17*)/Contents/Home
export ANDROID_HOME=~/tools/android-sdk
BT=$ANDROID_HOME/build-tools/36.0.0
# 이 빌드 시각을 앱과 웹(apk.json)에 적어 두면 갤럭시 설정의 '업데이트 확인'이 새 버전을 알아본다
BUILT=$(date +%s)
printf '// 자동 생성: scripts/build-android.sh가 APK를 만들 때 시각을 적는다. 여기서 고치지 말 것.\nexport const APK_BUILT = %s\n' "$BUILT" > galaxy/src/apkBuild.ts
(cd galaxy/android && ./gradlew :app:assembleRelease --no-daemon -q)
cp galaxy/android/app/build/outputs/apk/release/app-release.apk /tmp/filmchest-fat.apk
zip -d /tmp/filmchest-fat.apk 'lib/armeabi-v7a/*' 'lib/x86/*' 'lib/x86_64/*' || true
$BT/zipalign -f -p 4 /tmp/filmchest-fat.apk /tmp/filmchest-aligned.apk
export KSP=$(cat ~/tools/filmchest-keystore-password.txt)
$BT/apksigner sign --ks ~/tools/filmchest.keystore --ks-key-alias filmchest --ks-pass env:KSP --key-pass env:KSP \
  --out /tmp/filmchest.apk /tmp/filmchest-aligned.apk
printf '{"built": %s}\n' "$BUILT" > /tmp/apk.json
# 예전처럼 web/public에 남아 있으면 웹 배포에 다시 실린다
rm -f web/public/filmchest.apk
REPO=ssjjnnn002-cmd/filmchest
gh release view android -R $REPO >/dev/null 2>&1 || \
  gh release create android -R $REPO --title "안드로이드 앱" --notes "갤럭시용 필름함 앱. 최신 APK는 이 릴리스에 덮어 올린다." --latest=false
gh release upload android -R $REPO /tmp/filmchest.apk /tmp/apk.json --clobber
# 웹 설정 화면은 이 파일이 있을 때만 내려받기 버튼을 보여 준다 (작은 파일이라 Vercel에 둬도 된다)
cp /tmp/apk.json web/public/apk.json
echo "✓ 깃허브 릴리스 android 에 filmchest.apk, apk.json 올림"
