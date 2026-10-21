#!/bin/zsh
# 갤럭시용 필름함 앱(Expo)을 서명해 web/public/filmchest.apk 로 둔다.
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
  --out web/public/filmchest.apk /tmp/filmchest-aligned.apk
printf '{"built": %s}\n' "$BUILT" > web/public/apk.json
echo "✓ web/public/filmchest.apk"
