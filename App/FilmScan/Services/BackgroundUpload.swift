import Foundation
#if os(iOS)
import UIKit
#endif

/// 직접 누른 사진 올리기: 다른 앱으로 넘어가도 사진 준비를 잠깐(수십 초) 더 이어 간다.
/// 실제 전송은 DriveUploader(iOS 백그라운드 업로드)가 맡아서 앱을 닫아도 끝까지 간다.
@MainActor
enum BackgroundUpload {
    #if os(iOS)
    private static var task: UIBackgroundTaskIdentifier = .invalid

    static func begin() {
        end()
        task = UIApplication.shared.beginBackgroundTask(withName: "사진 올리기") { MainActor.assumeIsolated { end() } }
    }

    static func end() {
        guard task != .invalid else { return }
        UIApplication.shared.endBackgroundTask(task)
        task = .invalid
    }
    #else
    static func begin() {}
    static func end() {}
    #endif
}
