#!/bin/zsh
# 필름함을 USB(또는 같은 와이파이)로 연결한 아이폰에 설치한다.
#
#   ./scripts/install-iphone.sh          무료 Apple ID (7일마다 다시 설치, 앱 그룹 없음)
#   ./scripts/install-iphone.sh --paid   유료 개발자 계정 (앱 그룹 사용: '필름함으로 가져오기'가 앱을 바로 연다)
#
# 처음 한 번만: Xcode > Settings > Accounts 에서 Apple ID를 추가해 두어야 한다.
set -e
cd "$(dirname "$0")/.."

PAID=0
[[ "$1" == "--paid" ]] && PAID=1

# 1. 서명 팀 (Xcode에 로그인한 Apple ID의 개발 인증서에서 찾는다)
TEAM=${TEAM:-$(security find-certificate -a -c "Apple Development" -p 2>/dev/null \
  | openssl x509 -noout -subject 2>/dev/null | sed -n 's/.*OU *= *\([A-Z0-9]\{10\}\).*/\1/p' | head -1)}
# 인증서가 아직 없으면 Xcode에 로그인한 팀에서 찾는다 (인증서는 빌드할 때 Xcode가 만든다)
[[ -z "$TEAM" ]] && TEAM=$(defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier 2>/dev/null \
  | sed -n 's/.*teamID = \([A-Z0-9]\{10\}\);.*/\1/p' | head -1)
if [[ -z "$TEAM" ]]; then
  echo "Xcode에 로그인한 Apple ID를 찾지 못했어요."
  echo "Xcode > Settings > Accounts 에서 Apple ID를 추가하고, 'Manage Certificates…'에서 Apple Development 인증서를 만든 뒤 다시 실행해 주세요."
  exit 1
fi

# 2. 연결된 아이폰
JSON=$(mktemp)
xcrun devicectl list devices --json-output "$JSON" >/dev/null 2>&1 || true
DEVICE=$(node -e '
  const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).result?.devices ?? []
  const p = d.find((x) => x.hardwareProperties?.platform === "iOS" && x.hardwareProperties?.reality === "physical")
    ?? d.find((x) => x.hardwareProperties?.platform === "iOS" && x.hardwareProperties?.reality !== "simulated" && !x.deviceProperties?.osBuildUpdate?.includes?.("sim"))
  if (p) console.log(p.hardwareProperties.udid + " " + (p.deviceProperties?.name ?? "iPhone"))
' "$JSON" 2>/dev/null)
rm -f "$JSON"
if [[ -z "$DEVICE" ]]; then
  echo "연결된 아이폰을 찾지 못했어요. 케이블로 연결하고 아이폰에서 '이 컴퓨터를 신뢰'를 눌러 주세요."
  echo "(iOS 16 이상은 설정 > 개인정보 보호 및 보안 > 개발자 모드 를 켜야 해요)"
  exit 1
fi
UDID=${DEVICE%% *}
NAME=${DEVICE#* }

# 3. 번들 ID: 다른 사람과 겹치지 않게 팀 ID를 붙인다 (한 번 정하면 계속 같은 값)
PREFIX=${BUNDLE_ID_PREFIX:-kr.filmchest.$(echo "$TEAM" | tr 'A-Z' 'a-z')}
if (( PAID )); then
  ENT_APP="App/Config/FilmScan-iOS.entitlements"; ENT_SHARE="App/Config/FilmScanShare.entitlements"
else
  ENT_APP="App/Config/Free.entitlements"; ENT_SHARE="App/Config/Free.entitlements"
fi

echo "→ $NAME 에 설치합니다 (팀 $TEAM, 번들 $PREFIX$( (( PAID )) || echo ', 무료 계정'))"
xcodebuild -project FilmScan.xcodeproj -scheme FilmScan -configuration Release \
  -destination "id=$UDID" -derivedDataPath .build/device \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  DEVELOPMENT_TEAM="$TEAM" BUNDLE_ID_PREFIX="$PREFIX" \
  APP_ENTITLEMENTS="$ENT_APP" SHARE_ENTITLEMENTS="$ENT_SHARE" \
  build | grep -E "error:|warning: .*[Ss]ign|BUILD" || true

APP=.build/device/Build/Products/Release-iphoneos/Filmchest.app
[[ -d "$APP" ]] || { echo "빌드에 실패했어요. 위 오류를 확인해 주세요."; exit 1; }

xcrun devicectl device install app --device "$UDID" "$APP"
xcrun devicectl device process launch --device "$UDID" "$PREFIX" >/dev/null 2>&1 || \
  echo "설치는 됐어요. 처음 실행이 막히면 아이폰 설정 > 일반 > VPN 및 기기 관리 에서 개발자 앱을 '신뢰'해 주세요."
echo "✓ 설치 완료"
