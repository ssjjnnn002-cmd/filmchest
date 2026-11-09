import SwiftUI

extension View {
    /// 입력 화면 공통: 키보드 위치는 시스템이 맞춘다(입력칸이 키보드 위로 올라옴).
    /// 스크롤로는 키보드를 닫지 않는다. 닫기는 입력칸 밖 누르기·키보드 위 '완료'(KeyboardHelper).
    func filmKeyboard() -> some View {
        scrollDismissesKeyboard(.never)
    }
}
