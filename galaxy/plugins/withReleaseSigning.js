const { withAppBuildGradle } = require('expo/config-plugins')

const RELEASE = `
        release {
            def filmchestPasswordFile = new File(System.getProperty("user.home"), "tools/filmchest-keystore-password.txt")
            if (filmchestPasswordFile.exists()) {
                def filmchestPassword = filmchestPasswordFile.text.trim()
                storeFile new File(System.getProperty("user.home"), "tools/filmchest.keystore")
                storePassword filmchestPassword
                keyAlias "filmchest"
                keyPassword filmchestPassword
            }
        }`

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let src = config.modResults.contents
    if (!src.includes('abiFilters "arm64-v8a"')) {
      src = src.replace(
        /(versionName\s+"[^"]+")/,
        `$1\n        ndk {\n            abiFilters "arm64-v8a"\n        }`,
      )
    }
    if (!src.includes('lib/armeabi-v7a/**')) {
      src = src.replace(
        'useLegacyPackaging enableLegacyPackaging.toBoolean()',
        'useLegacyPackaging enableLegacyPackaging.toBoolean()\n            excludes += ["lib/armeabi-v7a/**", "lib/x86/**", "lib/x86_64/**"]',
      )
    }
    if (src.includes('filmchest.keystore')) {
      config.modResults.contents = src
      return config
    }
    if (!src.includes('signingConfigs {')) {
      throw new Error('android/app/build.gradle에 signingConfigs 블록이 없습니다.')
    }
    src = src.replace('signingConfigs {', `signingConfigs {${RELEASE}`)
    src = src.replace(
      /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release',
    )
    config.modResults.contents = src
    return config
  })
}

module.exports = withReleaseSigning
