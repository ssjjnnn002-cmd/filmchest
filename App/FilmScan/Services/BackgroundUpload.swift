import Foundation
#if os(iOS)
import BackgroundTasks
import UIKit
#endif

/// 직접 누른 사진 올리기를 다른 앱으로 넘어가도 이어 가게 한다.
/// iOS 26부터는 시스템이 진행 상황을 보여 주며 끝까지 이어 가고(BGContinuedProcessingTask), 그 전에는 몇십 초 더 이어 간다.
@MainActor
enum BackgroundUpload {
    #if os(iOS)
    static let identifier = (Bundle.main.bundleIdentifier ?? "kr.filmchest") + ".photos.upload"
    private static var task: BGTask?
    private static var fallback: UIBackgroundTaskIdentifier = .invalid
    private static var last: (done: Int, total: Int) = (0, 0)

    /// 앱이 켜질 때 한 번 (시작이 끝나기 전에 해야 한다)
    nonisolated static func register() {
        guard #available(iOS 26, *) else { return }
        BGTaskScheduler.shared.register(forTaskWithIdentifier: identifier, using: .main) { task in
            MainActor.assumeIsolated {
                // 일은 이미 앱 안에서 돌고 있다: 진행 상황만 이어 붙인다
                guard let task = task as? BGContinuedProcessingTask else { task.setTaskCompleted(success: false); return }
                self.task = task
                task.expirationHandler = { MainActor.assumeIsolated { self.task = nil } }
                update(last.done, last.total, "")
            }
        }
    }

    /// 올리기를 시작할 때
    static func begin() {
        last = (0, 0)
        fallback = UIApplication.shared.beginBackgroundTask(withName: "사진 올리기") { end(success: false) }
        guard #available(iOS 26, *) else { return }
        let request = BGContinuedProcessingTaskRequest(identifier: identifier, title: "드라이브에 사진 올리기", subtitle: "확인하는 중")
        request.strategy = .fail   // 바로 시작할 수 없으면 기다리지 않는다 (앱을 보고 있는 동안은 그대로 진행)
        try? BGTaskScheduler.shared.submit(request)
    }

    static func update(_ done: Int, _ total: Int, _ step: String) {
        last = (done, total)
        guard #available(iOS 26, *), let task = task as? BGContinuedProcessingTask else { return }
        task.progress.totalUnitCount = Int64(max(total, 1))
        task.progress.completedUnitCount = Int64(done)
        task.updateTitle("드라이브에 사진 올리기", subtitle: step.isEmpty ? "\(done) / \(total)장" : "\(done) / \(total)장 · \(step)")
    }

    static func end(success: Bool) {
        task?.setTaskCompleted(success: success)
        task = nil
        if fallback != .invalid {
            UIApplication.shared.endBackgroundTask(fallback)
            fallback = .invalid
        }
    }
    #else
    nonisolated static func register() {}
    static func begin() {}
    static func update(_ done: Int, _ total: Int, _ step: String) {}
    static func end(success: Bool) {}
    #endif
}
