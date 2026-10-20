// 파일 앱에서 zip을 '다음으로 열기'로 넘기면 content:// 주소가 들어온다. 화면 주소로 쓰지 않고 가져오기로 넘긴다.
import { receiveIncomingUrl } from '../src/incoming'

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (/^(content|file):/.test(path)) {
    void receiveIncomingUrl(path)
    return '/'
  }
  return path
}
