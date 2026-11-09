// 입력칸을 누른 순간 알린다 (키보드가 이미 떠 있을 때 다른 칸으로 옮겨 가도 그 칸을 보이게). overlay의 useScrollFocusedField가 듣는다
export const fieldFocusListeners = new Set<() => void>()
export function notifyFieldFocus() { fieldFocusListeners.forEach((fn) => fn()) }
