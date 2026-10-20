// 파일 앱 '다음으로 열기'로 받은 zip (안드로이드 VIEW 인텐트의 content:// 주소)
import { copyIn } from './files'
import type { PickedFile } from './pick'
import { uid } from './core/types'

let waiting: PickedFile[] = []
const listeners = new Set<(files: PickedFile[]) => void>()

/** expo-router가 받은 주소를 넘긴다. 앱 폴더로 복사해 두고 화면에 알린다. */
export async function receiveIncomingUrl(url: string) {
  if (!/^(content|file):/.test(url)) return false
  const name = decodeURIComponent(url.split('/').pop() ?? 'scan.zip').replace(/^.*[:/]/, '') || 'scan.zip'
  try {
    const uri = await copyIn(url, 'incoming', `${uid()}.zip`)
    const file: PickedFile = { uri, name: /\.zip$/i.test(name) ? name : `${name}.zip`, mimeType: 'application/zip' }
    if (listeners.size) listeners.forEach((fn) => fn([file]))
    else waiting.push(file)
  } catch { /* 읽을 수 없는 파일 */ }
  return true
}

export function takeIncoming() {
  const out = waiting
  waiting = []
  return out
}

export function onIncoming(fn: (files: PickedFile[]) => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
