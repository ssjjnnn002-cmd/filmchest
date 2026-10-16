import UIKit
import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// 공유 시트 '동작' 목록의 "필름함으로 가져오기".
/// 카톡/파일 앱에서 넘어온 zip을 대기함에 두고 필름함 앱을 연다. 앱에서 롤을 골라 이어서 진행한다.
/// 앱을 열 수 없으면(App Group을 못 쓰는 서명 등) 확장 안에서 바로 가져오기를 진행한다.
final class ShareViewController: UIViewController {
    private lazy var container = Store.makeContainer()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        // 앱 설정의 테마를 따른다
        switch AppearanceMode(rawValue: AppSettings.defaults.string(forKey: AppSettings.Key.appearance) ?? "") ?? .system {
        case .light: overrideUserInterfaceStyle = .light
        case .dark: overrideUserInterfaceStyle = .dark
        case .system: break
        }
        Task { await receive() }
    }

    private func receive() async {
        guard let received = await loadZip() else {
            show(AnyView(
                ContentUnavailableView("zip 파일을 찾지 못했어요", systemImage: "doc.zipper",
                                       description: Text("현상소에서 받은 zip 파일을 공유해 주세요."))
                    .overlay(alignment: .topTrailing) {
                        Button("닫기") { self.finish() }.padding()
                    }
            ))
            return
        }
        // 앱과 같은 저장 공간을 쓸 수 있으면 앱으로 넘긴다
        // 무료 Apple ID로 설치하면 앱과 저장 공간을 나눌 수 없다: 앱 줄의 '필름함'으로 안내
        guard Store.groupDirectory != nil else {
            show(AnyView(
                ContentUnavailableView("필름함 앱으로 열어 주세요", systemImage: "square.and.arrow.up",
                                       description: Text("공유 화면 위쪽 앱 목록에서 '필름함'을 누르면 앱에서 바로 이어서 가져와요."))
                    .overlay(alignment: .topTrailing) {
                        Button("닫기") { self.finish() }.padding()
                    }
            ))
            return
        }
        var zip = received
        if Store.putInInbox(zip) != nil {
            if openApp(URL(string: "filmchest://import")!) {
                finish()
                return
            }
            // 열지 못했으면 대기함에서 다시 꺼내 여기서 진행 (앱이 나중에 또 가져오지 않게)
            guard let back = Store.takeFromInbox() else { return finish() }
            zip = back
        }
        show(AnyView(
            ImportFlowView(zipURL: zip, preselectedRoll: nil) { [weak self] _ in self?.finish() }
                .syncCustomFilms()
                .modelContainer(container)
                .tint(Theme.safelight)
        ))
    }

    /// 확장에서 앱 열기: 응답 체인에서 UIApplication을 찾아 연다
    private func openApp(_ url: URL) -> Bool {
        var responder: UIResponder? = self
        while let r = responder {
            if let app = r as? UIApplication {
                app.open(url, options: [:], completionHandler: nil)
                return true
            }
            responder = r.next
        }
        return false
    }

    private func show(_ root: AnyView) {
        let host = UIHostingController(rootView: root)
        addChild(host)
        host.view.frame = view.bounds
        host.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(host.view)
        host.didMove(toParent: self)
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil)
    }

    /// 첨부 중 zip을 찾아 확장 임시 폴더로 복사한다 (원본 URL은 콜백이 끝나면 사라진다)
    private func loadZip() async -> URL? {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        let types = [UTType.zip.identifier, "com.pkware.zip-archive", UTType.fileURL.identifier, UTType.data.identifier]
        for provider in providers {
            guard let type = types.first(where: { provider.hasItemConformingToTypeIdentifier($0) }) else { continue }
            if let url = await copy(from: provider, type: type), isZip(url) { return url }
        }
        return nil
    }

    private func copy(from provider: NSItemProvider, type: String) async -> URL? {
        await withCheckedContinuation { continuation in
            _ = provider.loadFileRepresentation(forTypeIdentifier: type) { url, _ in
                guard let url else { continuation.resume(returning: nil); return }
                let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                let name = url.pathExtension.isEmpty ? url.lastPathComponent + ".zip" : url.lastPathComponent
                let dest = dir.appendingPathComponent(name)
                do {
                    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                    try FileManager.default.copyItem(at: url, to: dest)
                    continuation.resume(returning: dest)
                } catch {
                    continuation.resume(returning: nil)
                }
            }
        }
    }

    /// 확장자가 없어도 zip 시그니처(PK\x03\x04)로 확인
    private func isZip(_ url: URL) -> Bool {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return false }
        defer { try? handle.close() }
        return (try? handle.read(upToCount: 4)) == Data([0x50, 0x4B, 0x03, 0x04])
    }
}
