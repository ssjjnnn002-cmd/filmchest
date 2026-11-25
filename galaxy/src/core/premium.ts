// 자동 복사: web/src/core/premium.ts (node scripts/sync-galaxy-core.mjs). 여기서 고치지 말 것.
import { features } from './features'
import type { Roll } from './types'
import { getPref, setPref } from '../store'

/**
 * 무료와 프리미엄 (기획안 3·4번). 결제는 아직 없고 틀만 있다.
 *
 * - features.premium이 꺼져 있으면(지금) 누구나 모든 기능을 쓴다. 화면도 지금과 똑같다.
 * - 프리미엄인지는 isPremium() 한 곳에서만 판단한다.
 *   나중에 스토어 결제(StoreKit 2 / Google Play Billing)와 텀블벅 코드로 이 함수를 채운다.
 * - 개발자 모드의 '프리미엄 시험'으로 스위치를 이 기기에서만 켜고, 프리미엄 이용 중인 것처럼 바꿔 볼 수 있다.
 * - 아이폰 App/Shared/Services/Subscriptions.swift의 Premium과 같은 규칙.
 */

/** 무료로 한 달(기기 시간 기준 1일~말일)에 장착할 수 있는 롤 */
export const FREE_ROLLS_PER_MONTH = 4

const TEST_KEY = 'premiumTest'      // 개발자 모드: 무료/프리미엄 구분을 이 기기에서만 켬
const DEV_PREMIUM_KEY = 'premiumDev' // 개발자 모드: 프리미엄 이용 중인 것처럼

/** 무료/프리미엄 구분이 켜졌는지 */
export function premiumGateOn(): boolean {
  return features.premium || getPref<string>(TEST_KEY, '') === '1'
}

/** 프리미엄 기능을 쓸 수 있는지. 구분이 꺼져 있으면 늘 true */
export function isPremium(): boolean {
  if (!premiumGateOn()) return true
  // TODO: 스토어 구독·텀블벅 코드 확인
  return getPref<string>(DEV_PREMIUM_KEY, '') === '1'
}

export function premiumTestOn(): boolean { return getPref<string>(TEST_KEY, '') === '1' }
export function devPremiumOn(): boolean { return getPref<string>(DEV_PREMIUM_KEY, '') === '1' }
export function setPremiumTest(on: boolean) { setPref(TEST_KEY, on ? '1' : '') }
export function setDevPremium(on: boolean) { setPref(DEV_PREMIUM_KEY, on ? '1' : '') }
/** 개발자 모드를 끌 때 시험 값도 지운다 */
export function clearPremiumTest() { setPremiumTest(false); setDevPremium(false) }

/** 그 달 이름 (기기 시간). 예: 2027-01 */
export function monthKey(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 이번 달에 장착한 롤 수.
 * 장착할 때마다 센 수(지워도 줄지 않음)와, 이번 달에 장착한 롤(휴지통 포함, 가져온 기존 롤 제외) 중 큰 쪽.
 */
export function loadsThisMonth(rolls: Pick<Roll, 'loadedAt' | 'isArchive'>[], now = Date.now()): number {
  const key = monthKey(now)
  const counted = rolls.filter((r) => !r.isArchive && monthKey(r.loadedAt) === key).length
  const stored = Number(getPref<string>(`loads.${key}`, '0')) || 0
  return Math.max(stored, counted)
}

/** 장착 직전에 부른다: 이번 달 센 수를 하나 올린다 (before = 장착 전 loadsThisMonth) */
export function noteRollLoaded(before: number, now = Date.now()) {
  setPref(`loads.${monthKey(now)}`, String(before + 1))
}

/** 새 롤을 장착할 수 있는지 */
export function canLoadRoll(rolls: Pick<Roll, 'loadedAt' | 'isArchive'>[], now = Date.now()): boolean {
  return isPremium() || loadsThisMonth(rolls, now) < FREE_ROLLS_PER_MONTH
}

/** 컷별 상세 기록(다이얼 화면)을 새로 열 수 있는지. 이미 남긴 기록은 잠겨도 보이고 고칠 수 있다 */
export function canDetailRecord(): boolean {
  return isPremium()
}

export const rollLimitText = `이번 달 무료 ${FREE_ROLLS_PER_MONTH}롤을 모두 장착했어요. 프리미엄은 롤 수 제한이 없어요. 다음 달 1일에 다시 ${FREE_ROLLS_PER_MONTH}롤을 장착할 수 있어요.`
export const detailLockText = '컷별 상세 기록은 프리미엄 기능이에요. 이미 남긴 기록은 그대로 볼 수 있어요.'
