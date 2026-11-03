import SwiftUI
#if os(iOS)
import UIKit
#endif

extension View {
    /// 키보드가 올라와도 입력 칸의 커서를 빼지 않는다.
    func filmKeyboard() -> some View {
        modifier(FilmKeyboardInset())
    }
}

private struct FilmKeyboardInset: ViewModifier {
    @State private var overlap: CGFloat = 0

    func body(content: Content) -> some View {
        content
            // 여백이 늘거나 목록이 움직이는 것을 스크롤로 보면 키보드가 바로 내려가고 커서가 빠진다
            .scrollDismissesKeyboard(.never)
            #if os(iOS)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: overlap)
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillChangeFrameNotification)) { note in
                guard let frame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
                let next = max(0, UIScreen.main.bounds.maxY - frame.minY)
                guard next != overlap else { return }
                var transaction = Transaction()
                transaction.disablesAnimations = true
                withTransaction(transaction) { overlap = next }
            }
            #endif
    }
}
