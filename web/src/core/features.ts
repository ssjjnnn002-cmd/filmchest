/** 잠시 꺼 둔 기능. 노출계는 측광이 더 정확해지면 다시 켠다 (코드와 기록은 그대로 둔다). */
export const features = {
  meter: false,
  /** 가까운 현상소 찾기 (웹·갤럭시의 지도 바탕이 키 없이는 안 나와서 잠시 끔) */
  nearbyLabs: false,
  /** 스캔 가져올 때 노출계 기록을 앞뒤로 몇 칸 미루는 '번호 맞추기' */
  frameShift: false,
}
