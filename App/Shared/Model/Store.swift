import Foundation
import SwiftData

/// 앱과 공유 확장이 같은 데이터를 보도록 App Group 컨테이너에 저장한다.
/// App Group을 쓸 수 없는 환경(무료 계정, Mac)에서는 앱 자체 폴더를 쓴다.
enum Store {
    static let appGroupID = Bundle.main.object(forInfoDictionaryKey: "AppGroupID") as? String ?? "group.kr.filmchest.app"

    static var groupDirectory: URL? {
        #if os(iOS)
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupID)
        #else
        nil
        #endif
    }

    static var directory: URL {
        let base = groupDirectory
            ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("Filmchest", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static let schema = Schema([CameraItem.self, LensItem.self, RollItem.self, FrameItem.self, CustomFilmItem.self, ProjectItem.self, FilterItem.self, FilmLotItem.self])

    static func makeContainer() -> ModelContainer {
        let config = ModelConfiguration(schema: schema, url: directory.appendingPathComponent("Filmchest.store"),
                                        cloudKitDatabase: .none)
        do {
            return try ModelContainer(for: schema, configurations: config)
        } catch {
            fatalError("저장소를 열 수 없습니다: \(error)")
        }
    }

    // 공유 확장에서 저장하면 표시를 남겨, 앱이 돌아왔을 때 저장소를 다시 읽게 한다.
    private static var changeMarker: URL { directory.appendingPathComponent("external-change") }

    static func markExternalChange() {
        try? Data().write(to: changeMarker)
    }

    static func consumeExternalChange() -> Bool {
        guard FileManager.default.fileExists(atPath: changeMarker.path) else { return false }
        try? FileManager.default.removeItem(at: changeMarker)
        return true
    }

    // MARK: 가져오기 대기함
    // 가져오기 확장이 받은 zip을 여기에 두고 앱을 연다. 앱은 열릴 때 꺼내서 가져오기를 시작한다.

    static var inboxDirectory: URL {
        let dir = directory.appendingPathComponent("Inbox", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// 확장: 받은 파일을 대기함으로 옮긴다
    @discardableResult
    static func putInInbox(_ file: URL) -> URL? {
        let dest = inboxDirectory.appendingPathComponent("\(UUID().uuidString)-\(file.lastPathComponent)")
        do {
            try FileManager.default.moveItem(at: file, to: dest)
            return dest
        } catch {
            return nil
        }
    }

    /// 앱: 가장 최근에 받은 파일을 임시 폴더로 꺼낸다 (나머지는 지운다)
    /// 대기함의 zip을 모두 꺼낸다 (공유로 여러 개를 받은 경우)
    static func takeAllFromInbox() -> [URL] {
        var out: [URL] = []
        while let url = takeOldestFromInbox() { out.append(url) }
        return out
    }

    private static func takeOldestFromInbox() -> URL? {
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(at: inboxDirectory, includingPropertiesForKeys: [.creationDateKey]),
              let first = files.min(by: { ((try? $0.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast) < ((try? $1.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast) })
        else { return nil }
        defer { try? fm.removeItem(at: first) }
        let name = first.lastPathComponent.split(separator: "-", maxSplits: 5).last.map(String.init) ?? "scan.zip"
        let dest = fm.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true).appendingPathComponent(name)
        do {
            try fm.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            try fm.copyItem(at: first, to: dest)
            return dest
        } catch { return nil }
    }

    static func takeFromInbox() -> URL? {
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(at: inboxDirectory, includingPropertiesForKeys: [.creationDateKey]),
              !files.isEmpty else { return nil }
        let date = { (u: URL) in (try? u.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? .distantPast }
        let sorted = files.sorted { date($0) > date($1) }
        defer { for f in sorted { try? fm.removeItem(at: f) } }
        let name = sorted[0].lastPathComponent.split(separator: "-", maxSplits: 5).last.map(String.init) ?? "scan.zip"
        let dir = fm.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        let dest = dir.appendingPathComponent(name)
        do {
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
            try fm.copyItem(at: sorted[0], to: dest)
            return dest
        } catch {
            return nil
        }
    }
}

#if canImport(UIKit)
import UIKit

/// 무료 Apple ID 설치처럼 앱과 확장이 저장 공간을 나눌 수 없을 때: 같은 팀 앱끼리만 보이는
/// 이름 붙은 붙여넣기 판으로 받은 파일을 한 장씩 넘긴다 (메모리에 한꺼번에 올리지 않게).
enum Handoff {
    private static let board = UIPasteboard.Name("kr.filmchest.handoff")
    private static let nameType = "kr.filmchest.filename"
    private static let dataType = "public.data"

    static func put(_ files: [URL]) -> Bool {
        guard let pb = UIPasteboard(name: board, create: true) else { return false }
        pb.items = []
        var count = 0
        for file in files {
            autoreleasepool {
                guard let data = try? Data(contentsOf: file, options: .mappedIfSafe) else { return }
                pb.addItems([[nameType: file.lastPathComponent, dataType: data]])
                count += 1
            }
        }
        return count > 0
    }

    static func take() -> [URL] {
        guard let pb = UIPasteboard(name: board, create: false), pb.numberOfItems > 0 else { return [] }
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var out: [URL] = []
        for i in 0..<pb.numberOfItems {
            autoreleasepool {
                let set = IndexSet(integer: i)
                guard let data = pb.data(forPasteboardType: dataType, inItemSet: set)?.first else { return }
                let name = (pb.values(forPasteboardType: nameType, inItemSet: set)?.first as? String) ?? "file-\(i)"
                let dest = dir.appendingPathComponent(String(format: "%03d-", i) + name)
                if (try? data.write(to: dest)) != nil { out.append(dest) }
            }
        }
        pb.items = []
        return out
    }
}
#endif
