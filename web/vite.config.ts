import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react()],
  // 개발할 때만: 실제 현상소 샘플 zip을 불러오는 버튼 (배포본에는 들어가지 않는다)
  define: {
    __SAMPLE_ZIP__: JSON.stringify(command === 'serve'
      ? '/@fs' + path.resolve(__dirname, '../sample/MINOLTA_X-700_50mm_F1.7_ILFORD HP5 PLUS_400_망원동.zip')
      : ''),
    __APP_VERSION__: JSON.stringify('1.5.0'),
  },
  server: { port: 5199, fs: { allow: ['..'] } },
  build: {
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' } },
  },
}))
