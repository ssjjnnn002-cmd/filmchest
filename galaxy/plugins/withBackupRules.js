// 안드로이드 자동 백업(구글 드라이브)에 기록 백업 파일만 올린다. 스캔 사진·DB는 빼서 용량 한도(25MB)를 넘지 않게.
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const legacy = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <include domain="file" path="backup/" />
</full-backup-content>
`
const modern = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <include domain="file" path="backup/" />
  </cloud-backup>
  <device-transfer>
    <include domain="file" path="backup/" />
  </device-transfer>
</data-extraction-rules>
`

module.exports = function withBackupRules(config) {
  config = withDangerousMod(config, ['android', (c) => {
    const dir = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res/xml')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'backup_rules.xml'), legacy)
    fs.writeFileSync(path.join(dir, 'data_extraction_rules.xml'), modern)
    return c
  }])
  return withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application[0]
    app.$['android:allowBackup'] = 'true'
    app.$['android:fullBackupContent'] = '@xml/backup_rules'
    app.$['android:dataExtractionRules'] = '@xml/data_extraction_rules'
    return c
  })
}
