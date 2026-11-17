import Foundation
import SwiftData

/// 기기 사이 맞추기 규칙 (웹·갤럭시 core/syncMerge.ts와 같음)
/// - 저장할 때 바뀐 줄에 고친 시각(updatedAt)을 붙인다. 받은 줄은 더 최근일 때만 덮는다
/// - 지우면 지움 표시(표 → id → 지운 시각)를 남겨 백업 파일 deleted 칸으로 보낸다. 90일 지나면 버린다
/// - 드라이브에서 받은 것을 넣는 동안(applyingRemote)은 시각을 붙이지 않고 표시도 남기지 않는다
enum SyncStamp {
    typealias Tombs = [String: [String: Double]]
    nonisolated(unsafe) static var applyingRemote = 0
    private static let tombKey = "filmscan.syncTombs"
    static let tombDays = 90.0

    static func ms(_ d: Date) -> Double { (d.timeIntervalSince1970 * 1000).rounded() }

    static var tombs: Tombs {
        get {
            guard let data = UserDefaults.standard.data(forKey: tombKey),
                  let t = try? JSONDecoder().decode(Tombs.self, from: data) else { return [:] }
            return t
        }
        set { UserDefaults.standard.set(try? JSONEncoder().encode(newValue), forKey: tombKey) }
    }

    static func adding(_ t: Tombs, _ table: String, _ id: String, at: Double) -> Tombs {
        var out = t
        let k = id.lowercased()
        out[table, default: [:]][k] = max(at, out[table]?[k] ?? 0)
        return out
    }

    static func merged(_ a: Tombs, _ b: Tombs) -> Tombs {
        var out = a
        for (table, ids) in b { for (id, at) in ids { out = adding(out, table, id, at: at) } }
        return out
    }

    static func pruned(_ t: Tombs, now: Date = Date()) -> Tombs {
        let cut = ms(now) - tombDays * 86_400_000
        return t.compactMapValues { ids in
            let keep = ids.filter { $0.value >= cut }
            return keep.isEmpty ? nil : keep
        }
    }

    /// 이 줄이 지움 표시 뒤로 고쳐진 적 없으면 true (지워야 함)
    static func kills(_ t: Tombs, _ table: String, _ id: String, updatedAt: Double) -> Bool {
        guard let at = t[table]?[id.lowercased()] else { return false }
        return at >= updatedAt
    }

    /// 받은 줄을 쓸지: 이 기기 줄이 더 최근에 고친 것이면 쓰지 않는다. 둘 다 시각이 없으면 받은 것을 쓴다
    static func remoteWins(local: Double?, remote: Double) -> Bool {
        guard let local else { return true }
        if local == 0 && remote == 0 { return true }
        return remote >= local
    }

    /// 맞추는 표와 id (스캔 사진 줄은 드라이브 사진으로 따로 맞춘다)
    static func key(_ m: any PersistentModel) -> (table: String, id: String)? {
        switch m {
        case let x as CameraItem: ("cameras", x.id.uuidString)
        case let x as LensItem: ("lenses", x.id.uuidString)
        case let x as FilterItem: ("filters", x.id.uuidString)
        case let x as FilmLotItem: ("filmLots", x.id.uuidString)
        case let x as CustomFilmItem: ("customFilms", x.id)
        case let x as RollItem: ("rolls", x.id.uuidString)
        case let x as ProjectItem: ("projects", x.id.uuidString)
        default: nil
        }
    }

    private static func stamp(_ m: any PersistentModel, _ now: Date) {
        switch m {
        case let x as CameraItem: x.updatedAt = now
        case let x as LensItem: x.updatedAt = now
        case let x as FilterItem: x.updatedAt = now
        case let x as FilmLotItem: x.updatedAt = now
        case let x as CustomFilmItem: x.updatedAt = now
        case let x as RollItem: x.updatedAt = now
        case let x as ProjectItem: x.updatedAt = now
        default: break
        }
    }

    nonisolated(unsafe) private static var observer: NSObjectProtocol?

    /// 앱 시작 때 한 번: 어느 저장소든 저장하기 직전에 시각·지움 표시를 붙인다
    static func start() {
        guard observer == nil else { return }
        observer = NotificationCenter.default.addObserver(forName: ModelContext.willSave, object: nil, queue: nil) { note in
            guard applyingRemote == 0, let ctx = note.object as? ModelContext else { return }
            let now = Date()
            for m in ctx.insertedModelsArray { stamp(m, now) }
            for m in ctx.changedModelsArray { stamp(m, now) }
            let gone = ctx.deletedModelsArray.compactMap(key)
            if !gone.isEmpty {
                var t = tombs
                for g in gone { t = adding(t, g.table, g.id, at: ms(now)) }
                tombs = t
            }
        }
    }
}
