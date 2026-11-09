#if os(iOS)
import UIKit

/// 앱 전체 키보드 닫기 (웹·갤럭시와 같음)
/// - 입력칸 밖을 누르면 닫는다. 스크롤·끌기는 누름이 아니라서 닫지 않는다. 눌린 버튼은 그대로 동작한다.
/// - 키보드 위에 '완료' 줄을 붙인다 (숫자 키패드처럼 완료 키가 없는 키보드도 닫을 수 있게).
/// 화면마다 붙이지 않고 앱이 켜질 때 한 번 건다.
@MainActor
final class KeyboardHelper: NSObject, UIGestureRecognizerDelegate {
    static let shared = KeyboardHelper()
    private var installed = Set<ObjectIdentifier>()

    func install() {
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(windowBecameKey(_:)), name: UIWindow.didBecomeKeyNotification, object: nil)
        center.addObserver(self, selector: #selector(beganEditing(_:)), name: UITextField.textDidBeginEditingNotification, object: nil)
        center.addObserver(self, selector: #selector(beganEditing(_:)), name: UITextView.textDidBeginEditingNotification, object: nil)
    }

    @objc private func windowBecameKey(_ note: Notification) {
        guard let window = note.object as? UIWindow, !installed.contains(ObjectIdentifier(window)) else { return }
        installed.insert(ObjectIdentifier(window))
        let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
        tap.cancelsTouchesInView = false
        tap.delegate = self
        window.addGestureRecognizer(tap)
    }

    @objc private func tapped(_ tap: UITapGestureRecognizer) {
        tap.view?.endEditing(true)
    }

    // 입력칸(과 그 안)을 누른 건 닫지 않는다
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        var view = touch.view
        while let v = view {
            if v is UITextField || v is UITextView || v is UISearchBar { return false }
            view = v.superview
        }
        return true
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }

    @objc private func beganEditing(_ note: Notification) {
        // SwiftUI 입력칸은 자체 빈 보조 뷰를 달고 있어서 비었는지로 고르지 않는다. 우리 줄이 이미 있으면 그대로
        if let field = note.object as? UITextField, !(field.inputAccessoryView is DoneBar) {
            field.inputAccessoryView = doneBar()
            field.reloadInputViews()
        } else if let view = note.object as? UITextView, view.isEditable, !(view.inputAccessoryView is DoneBar) {
            view.inputAccessoryView = doneBar()
            view.reloadInputViews()
        }
    }

    private final class DoneBar: UIToolbar {}

    private func doneBar() -> UIToolbar {
        let bar = DoneBar(frame: CGRect(x: 0, y: 0, width: 320, height: 44))
        let done = UIBarButtonItem(title: "완료", style: .done, target: self, action: #selector(closeKeyboard))
        bar.items = [UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil), done]
        bar.sizeToFit()
        return bar
    }

    @objc private func closeKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
#endif
