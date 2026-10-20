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
        // zip·풀린 폴더가 있으면 그것만, 없으면 사진들 (사진 앱에서 여러 장 공유)
        // 파일 앱의 zip·폴더는 원래 위치를 앱에 알려 앱이 직접 연다 (무료 설치도 된다)
        if let link = await fileLink(), openApp(link) { return finish() }
        let zips = await loadZips()
        let folders = zips.isEmpty ? await loadFolders() : []
        if zips.isEmpty && folders.isEmpty {
            await receivePhotos()
            return
        }
        // zip·폴더는 앱과 같은 저장 공간으로 넘긴다. 무료 Apple ID 설치는 나눌 공간이 없어서 다른 길로 안내
        guard Store.groupDirectory != nil else {
            show(message("필름함에서 열어 주세요", "arrow.up.forward.app",
                         zips.isEmpty
                         ? "이 설치 방식에서는 공유로 폴더를 넘길 수 없어요. 필름함 › 현상 스캔 › zip 파일 열기에서 폴더를 골라 주세요."
                         : "이 설치 방식에서는 공유로 zip을 넘길 수 없어요. 파일 앱에서 zip을 길게 누르고 다음으로 열기 › 필름함을 눌러 주세요."))
            return
        }
        guard (zips + folders).allSatisfy({ Store.putInInbox($0) != nil }) else {
            show(message("파일을 넘기지 못했어요", "exclamationmark.triangle", "다시 공유해 주세요."))
            return
        }
        if openApp(URL(string: "filmchest://import")!) { return finish() }
        show(message("필름함을 열어 주세요", "arrow.up.forward.app", "필름함 앱을 열면 받은 파일로 바로 이어서 가져와요."))
    }

    /// 사진 앱 사진: 파일 대신 이름·시각·크기만 앱에 알려 사진 앱에서 찾아 연결한다 (복사하지 않는다)
    private func receivePhotos() async {
        let photos = await loadImages()
        guard !photos.isEmpty else {
            show(message("가져올 파일이 없어요", "doc.zipper", "현상소에서 받은 zip, 풀린 폴더, 스캔 사진을 공유해 주세요."))
            return
        }
        let refs = photos.map { SharedPhotoRef(file: $0.url, name: $0.name) }
        // 같은 저장 공간이 있으면 사진 앱에서 못 찾을 때를 대비해 파일도 넘겨 둔다
        if Store.groupDirectory != nil { for p in photos { Store.putInInbox(p.url) } }
        if let url = SharedPhotoRef.url(refs), openApp(url) { return finish() }
        show(message("필름함을 열어 주세요", "arrow.up.forward.app", "앱을 열지 못했어요. 필름함 › 현상 스캔 › + › 기존 롤 가져오기 › 사진 앱에서 고르기로 가져올 수 있어요."))
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
                var isDir: ObjCBool = false
                FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir)
                let name = url.pathExtension.isEmpty && !isDir.boolValue && type != UTType.folder.identifier && type != UTType.directory.identifier
                    ? url.lastPathComponent + ".zip" : url.lastPathComponent
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

    /// 공유한 사진들 (순서대로) — 원래 이름과 함께
    private func loadImages() async -> [(url: URL, name: String)] {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        var out: [(url: URL, name: String)] = []
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
            let type = [UTType.jpeg.identifier, UTType.heic.identifier, UTType.png.identifier, UTType.tiff.identifier, UTType.image.identifier]
                .first { provider.hasItemConformingToTypeIdentifier($0) } ?? UTType.image.identifier
            if let url = await copy(from: provider, type: type) {
                let suggested = provider.suggestedName.map { name -> String in
                    (name as NSString).pathExtension.isEmpty ? name + "." + url.pathExtension : name
                }
                out.append((url, suggested ?? url.lastPathComponent))
            }
        }
        return out
    }

    /// zip·폴더의 원래 위치를 앱이 직접 열 수 있게 북마크로 넘긴다 (무료 설치도 된다)
    private func fileLink() async -> URL? {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        var marks: [String] = []
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
            let item: URL? = await withCheckedContinuation { c in
                provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier) { value, _ in
                    c.resume(returning: (value as? URL) ?? (value as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) })
                }
            }
            guard let src = item else { continue }
            let ok = src.startAccessingSecurityScopedResource()
            defer { if ok { src.stopAccessingSecurityScopedResource() } }
            guard ScanFolder.isFolder(src) || src.pathExtension.lowercased() == "zip",
                  let data = try? src.bookmarkData() else { continue }
            marks.append(data.base64EncodedString())
        }
        guard !marks.isEmpty, let json = try? JSONEncoder().encode(marks) else { return nil }
        let b64 = json.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
        return URL(string: "filmchest://folders?d=\(b64)")
    }

    /// 파일 앱에서 공유한 (압축을 푼) 폴더. 파일 앱은 폴더를 파일 주소(public.file-url)로만 넘긴다.
    private func loadFolders() async -> [URL] {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        var out: [URL] = []
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
            let item: URL? = await withCheckedContinuation { c in
                provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier) { value, _ in
                    c.resume(returning: (value as? URL) ?? (value as? Data).flatMap { URL(dataRepresentation: $0, relativeTo: nil) })
                }
            }
            guard let src = item else { continue }
            let ok = src.startAccessingSecurityScopedResource()
            defer { if ok { src.stopAccessingSecurityScopedResource() } }
            guard ScanFolder.isFolder(src) else { continue }
            let dest = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
                .appendingPathComponent(src.lastPathComponent, isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
                try FileManager.default.copyItem(at: src, to: dest)
                out.append(dest)
            } catch { continue }
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
