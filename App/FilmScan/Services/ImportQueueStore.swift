import Foundation

/// 여러 롤 가져오기 대기열. 앱을 닫아도 앱 안에 남긴다.
enum ImportQueueStore {
    struct Job: Codable, Identifiable, Hashable {
        var id: UUID
        var storedName: String
        var displayName: String
        var index: Int
        var total: Int
        var name: String { displayName }
    }

    static var folder: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("import-queue", isDirectory: true)
    }

    static func fileURL(_ job: Job) -> URL {
        folder.appendingPathComponent(job.storedName)
    }

    static func load() -> [Job] {
        let url = folder.appendingPathComponent("queue.json")
        guard let data = try? Data(contentsOf: url),
              let jobs = try? JSONDecoder().decode([Job].self, from: data) else { return [] }
        return jobs.filter { FileManager.default.fileExists(atPath: fileURL($0).path) }
    }

    static func add(_ urls: [URL]) -> [Job] {
        var jobs = load()
        var added: [Job] = []
        let start = jobs.count
        for url in urls where url.pathExtension.lowercased() == "zip" || ScanFolder.isFolder(url) {
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            let id = UUID()
            let stored = ScanFolder.isFolder(url) ? id.uuidString : "\(id.uuidString).zip"
            let dest = folder.appendingPathComponent(stored)
            do {
                try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                if FileManager.default.fileExists(atPath: dest.path) {
                    try FileManager.default.removeItem(at: dest)
                }
                try FileManager.default.copyItem(at: url, to: dest)
                let job = Job(id: id, storedName: stored, displayName: url.lastPathComponent,
                              index: start + added.count + 1, total: 0)
                added.append(job)
            } catch {
                continue
            }
        }
        guard !added.isEmpty else { return [] }
        jobs.append(contentsOf: added)
        let total = jobs.count
        for i in jobs.indices {
            jobs[i].index = i + 1
            jobs[i].total = total
        }
        save(jobs)
        return Array(jobs.suffix(added.count))
    }

    static func remove(_ job: Job) {
        var jobs = load().filter { $0.id != job.id }
        try? FileManager.default.removeItem(at: fileURL(job))
        let total = jobs.count
        for i in jobs.indices {
            jobs[i].index = i + 1
            jobs[i].total = total
        }
        save(jobs)
    }

    private static func save(_ jobs: [Job]) {
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let url = folder.appendingPathComponent("queue.json")
        if let data = try? JSONEncoder().encode(jobs) {
            try? data.write(to: url, options: .atomic)
        }
    }
}
