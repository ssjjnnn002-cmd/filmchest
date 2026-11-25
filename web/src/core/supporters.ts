/**
 * 함께 만든 분들 (텀블벅 선물 아이템 1). 설정 맨 아래 '함께 만든 분들' 화면에 한 줄씩 나온다.
 * 펀딩 결제가 끝난 뒤 텀블벅 후원자 관리의 '올릴 이름' 답을 넣는다 (빈 칸은 넣지 않는다).
 * 목록이 비어 있으면 설정에 줄 자체가 보이지 않는다.
 *
 * 세 앱이 이 파일 하나를 쓴다: 고친 뒤 node scripts/sync-galaxy-core.mjs
 * → 갤럭시 galaxy/src/core/supporters.ts, 아이폰 App/Shared/Model/Supporters.swift 로 복사된다.
 * 이름은 큰따옴표로, 한 줄에 하나씩.
 */
export const supporters: string[] = [
]

/** 화면에 올릴 이름 (앞뒤 공백 정리, 빈 이름·중복 제외, 넣은 순서 그대로) */
export function supporterNames(list: string[] = supporters): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const name = raw.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}
