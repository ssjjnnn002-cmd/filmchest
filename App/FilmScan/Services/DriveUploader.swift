import Foundation
#if os(iOS)
import UIKit
#endif

/// 드라이브로 사진 보내기는 iOS에 맡긴다 (백그라운드 세션): 앱을 닫거나 다른 앱으로 가도 끝까지 올라간다.
/// 앱은 사진 파일을 준비해서 줄만 세우고, 다 올라가면 '올렸음'으로 기억한다.
final class DriveUploader: NSObject, URLSessionDataDelegate, @unchecked Sendable {
    static let shared = DriveUploader()
    static let doneNotification = Notification.Name("DriveUploader.done")
    private static let identifier = (Bundle.main.bundleIdentifier ?? "kr.filmchest") + ".drive-upload"

    /// iOS가 앱을 깨워 끝난 일을 알려 줄 때 받은 완료 콜백
    var wakeCompletion: (() -> Void)?

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: Self.identifier)
        config.isDiscretionary = false          // 바로 올린다 (와이파이·충전을 기다리지 않음)
        config.sessionSendsLaunchEvents = true
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()

    /// 보낼 사진이 쌓이는 곳 (다 올라가면 지운다)
    private static var folder: URL {
        let url = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("drive-upload", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    /// 앱이 켜질 때 세션을 다시 이어 붙인다 (밖에서 끝난 일도 받기 위해)
    func resume() { _ = session }

    /// 아직 올라가는 중인 컷 ("롤id-컷")
    func pendingKeys() async -> Set<String> {
        Set(await session.allTasks.compactMap { $0.taskDescription?.components(separatedBy: "|").first })
    }

    func pendingCount() async -> Int { await session.allTasks.count }

    /// 사진 하나를 줄 세운다. key: "롤id-컷", stamp: 사진 앱 수정 시각
    func enqueue(_ data: Data, fileID: String, key: String, stamp: String) async throws {
        let file = Self.folder.appendingPathComponent("\(key).jpg")
        try data.write(to: file)
        try await send(file, fileID: fileID, key: key, stamp: stamp, attempt: 1)
    }

    /// 보낼 때마다 새 로그인 정보를 붙인다 (구글 로그인은 1시간이면 끝나서, 줄이 길면 뒤쪽이 거절된다)
    private func send(_ file: URL, fileID: String, key: String, stamp: String, attempt: Int) async throws {
        var req = URLRequest(url: URL(string: "https://www.googleapis.com/upload/drive/v3/files/\(fileID)?uploadType=media")!)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(try await GoogleAuth.token())", forHTTPHeaderField: "Authorization")
        req.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        let task = session.uploadTask(with: req, fromFile: file)
        task.taskDescription = "\(key)|\(fileID)|\(stamp)|\(attempt)"
        task.resume()
    }

    // MARK: - 끝났을 때

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        let parts = task.taskDescription?.components(separatedBy: "|") ?? []
        guard parts.count >= 3 else { return }
        let status = (task.response as? HTTPURLResponse)?.statusCode ?? 0
        let file = Self.folder.appendingPathComponent("\(parts[0]).jpg")
        let attempt = parts.count > 3 ? Int(parts[3]) ?? 1 : 1
        guard error == nil, (200..<300).contains(status) else {
            // 실패: 새 로그인 정보로 세 번까지 다시 보내고, 그래도 안 되면 다음 확인 때 다시
            if attempt < 3, FileManager.default.fileExists(atPath: file.path) {
                Task { @MainActor in
                    do { try await self.send(file, fileID: parts[1], key: parts[0], stamp: parts[2], attempt: attempt + 1) }
                    catch { try? FileManager.default.removeItem(at: file); DrivePhotos.uploadFailed(status) }
                }
            } else {
                try? FileManager.default.removeItem(at: file)
                DispatchQueue.main.async { DrivePhotos.uploadFailed(status) }
            }
            return
        }
        try? FileManager.default.removeItem(at: file)
        DispatchQueue.main.async {
            DrivePhotos.uploaded(parts[0], "\(parts[1])|\(parts[2])")
            NotificationCenter.default.post(name: Self.doneNotification, object: nil)
        }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async {
            self.wakeCompletion?()
            self.wakeCompletion = nil
        }
    }
}

#if os(iOS)
/// iOS가 백그라운드 업로드를 마치고 앱을 깨울 때
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        DriveUploader.shared.wakeCompletion = completionHandler
        DriveUploader.shared.resume()
    }
}
#endif
