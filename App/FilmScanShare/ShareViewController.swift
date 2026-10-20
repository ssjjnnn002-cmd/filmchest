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
        // zip이 있으면 zip만, 없으면 사진들 (사진 앱에서 여러 장 공유)
        let zips = await loadZips()
        let files = zips.isEmpty ? await loadImages() : zips
        guard !files.isEmpty else {
            show(message("가져올 파일이 없어요", "doc.zipper", "현상소에서 받은 zip이나 스캔 사진을 공유해 주세요."))
            return
        }
        // 앱으로 넘긴다: 같은 저장 공간이 있으면 대기함, 없으면(무료 Apple ID 설치) 붙여넣기 판으로
        let handed = Store.groupDirectory != nil
            ? files.allSatisfy { Store.putInInbox($0) != nil }
            : Handoff.put(files)
        guard handed else {
            show(message("파일을 넘기지 못했어요", "exclamationmark.triangle", "다시 공유해 주세요."))
            return
        }
        if openApp(URL(string: "filmchest://import")!) { return finish() }
        show(message("필름함을 열어 주세요", "arrow.up.forward.app", "필름함 앱을 열면 받은 파일로 바로 이어서 가져와요."))
    }

    private func message(_ title: String, _ icon: String, _ detail: String) -> AnyView {
        AnyView(
            ContentUnavailableView(title, systemImage: icon, description: Text(detail))
                .overlay(alignment: .topTrailing) { Button("닫기") { self.finish() }.padding() }
        )
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
    private func loadZips() async -> [URL] {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        let types = [UTType.zip.identifier, "com.pkware.zip-archive", UTType.fileURL.identifier, UTType.data.identifier]
        var out: [URL] = []
        for provider in providers {
            guard let type = types.first(where: { provider.hasItemConformingToTypeIdentifier($0) }) else { continue }
            if let url = await copy(from: provider, type: type), isZip(url) { out.append(url) }
        }
        return out
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

    /// 공유한 사진들 (순서대로)
    private func loadImages() async -> [URL] {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        var out: [URL] = []
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            let type = [UTType.jpeg.identifier, UTType.heic.identifier, UTType.png.identifier, UTType.tiff.identifier, UTType.image.identifier]
                .first { provider.hasItemConformingToTypeIdentifier($0) } ?? UTType.image.identifier
            if let url = await copy(from: provider, type: type) { out.append(url) }
        }
        return out
    }

    /// 확장자가 없어도 zip 시그니처(PK\x03\x04)로 확인
    private func isZip(_ url: URL) -> Bool {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return false }
        defer { try? handle.close() }
        return (try? handle.read(upToCount: 4)) == Data([0x50, 0x4B, 0x03, 0x04])
    }
}
