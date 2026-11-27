import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'
import type { Plugin } from 'vite'

// 배경 지우기 모델 실행기(onnxruntime-web)의 wasm을 /ort/ 로 내보낸다 (app.js에 넣으면 14MB가 붙는다)
const ORT = ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']
const ortDir = path.resolve(__dirname, 'node_modules/onnxruntime-web/dist')
function ortFiles(): Plugin {
  return {
    name: 'ort-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].replace(/^\/ort\//, '')
        if (!req.url?.startsWith('/ort/') || !name || !ORT.includes(name)) return next()
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
        fs.createReadStream(path.join(ortDir, name)).pipe(res)
      })
    },
    generateBundle() {
      for (const name of ORT) this.emitFile({ type: 'asset', fileName: `ort/${name}`, source: fs.readFileSync(path.join(ortDir, name)) })
    },
    // 실행기가 스스로 챙기는 wasm 사본(assets/)은 쓰지 않는다 (ort/를 씀). 14MB를 두 번 올리지 않게
    closeBundle() {
      const dir = path.resolve(__dirname, 'dist/assets')
      if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (/^ort-wasm.*\.wasm$/.test(f)) fs.rmSync(path.join(dir, f))
    },
  }
}

export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react(), ortFiles()],
  worker: { format: 'es', rollupOptions: { output: { entryFileNames: 'bg-worker.js' } } },
  // 개발할 때만: 실제 현상소 샘플 zip을 불러오는 버튼 (배포본에는 들어가지 않는다)
  define: {
    __SAMPLE_ZIP__: JSON.stringify(command === 'serve'
      ? '/@fs' + path.resolve(__dirname, '../sample/MINOLTA_X-700_50mm_F1.7_ILFORD HP5 PLUS_400_망원동.zip')
      : ''),
    __APP_VERSION__: JSON.stringify('1.5.9'),
  },
  server: { port: 5199, fs: { allow: ['..'] } },
  build: {
    target: 'es2022',
    // 그림·글꼴은 app.js 안에 넣는다. 모델 실행기(wasm)는 크니까 따로 (ort/)
    assetsInlineLimit: (file: string) => (/\.(wasm|mjs)$/.test(file) ? false : undefined) ?? true,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' } },
  },
}))
