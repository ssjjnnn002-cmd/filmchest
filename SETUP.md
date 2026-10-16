# 다른 컴퓨터에서 이어서 작업하기

```bash
git clone <저장소 주소> filmscan
cd filmscan/web && npm install
cd ../galaxy && npm install --legacy-peer-deps
```

## git에 없는 것 (직접 옮기기)

- `web/.env.local`, `prototypes/meter/.env.local` — 웹 환경 값
- `~/tools/filmchest.keystore`, `~/tools/filmchest-keystore-password.txt` — 갤럭시 출시용 서명
- `~/tools/jdk-17…`, `~/tools/android-sdk` — 갤럭시 빌드 도구
- `sample/` — 테스트용 스캔 zip

## 빌드

- 아이폰: `FilmScan.xcodeproj`를 Xcode로 열기
- 웹: `cd web && npm run dev`
- 갤럭시: `node scripts/sync-galaxy-core.mjs` → `cd galaxy && npx expo prebuild --platform android` → `cd android && ./gradlew assembleRelease`
- 노출계를 고치면 `node scripts/sync-meter.mjs`
