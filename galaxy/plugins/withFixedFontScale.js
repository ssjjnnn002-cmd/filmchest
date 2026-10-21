// 휴대폰 '글자 크기' 설정과 상관없이 앱 글자를 웹앱과 같은 크기로 고정한다 (큰 글꼴 설정에서 레이아웃이 깨지지 않게)
const { withMainActivity, withMainApplication } = require('expo/config-plugins')

const IMPORTS = ''
const METHOD = `
  override fun attachBaseContext(base: android.content.Context) {
    val config = android.content.res.Configuration(base.resources.configuration)
    config.fontScale = 1.0f
    super.attachBaseContext(base.createConfigurationContext(config))
  }
`

function patch(src, classLine) {
  if (src.includes('config.fontScale = 1.0f')) return src
  return src.replace(classLine, (m) => `${m}${METHOD}`)
}

module.exports = function withFixedFontScale(config) {
  config = withMainActivity(config, (c) => {
    c.modResults.contents = patch(c.modResults.contents, /class MainActivity : ReactActivity\(\) \{\n/)
    return c
  })
  return withMainApplication(config, (c) => {
    c.modResults.contents = patch(c.modResults.contents, /class MainApplication : Application\(\), ReactApplication \{\n/)
    return c
  })
}
