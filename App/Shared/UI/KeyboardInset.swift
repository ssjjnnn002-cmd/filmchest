import SwiftUI
#if os(iOS)
import UIKit
#endif

extension View {
    /// 키보드가 입력 칸을 가리면 그 높이만큼 스크롤 여백을 넣는다.
    func filmKeyboard() -> some View {
        modifier(FilmKeyboardInset())
    }
}

private struct FilmKeyboardInset: ViewModifier {
    @State private var overlap: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .scrollDismissesKeyboard(.interactively)
            #if os(iOS)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Color.clear.frame(height: overlap)
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillChangeFrameNotification)) { note in
                guard let frame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
                let screenMaxY = UIScreen.main.bounds.maxY
                let duration = note.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double ?? 0.25
                let next = max(0, screenMaxY - frame.minY)
                withAnimation(.easeOut(duration: duration)) { overlap = next }
            }
            #endif
    }
}
