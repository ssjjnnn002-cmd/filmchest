import Foundation
import SwiftData
import FilmScanCore

/// 처음 열었을 때 둘러볼 수 있는 예시 (웹 seed.ts와 같은 내용).
/// 웹 백업 형식으로 만들어 WebFormat.merge로 넣고, 예시 사진(Resources/Demo)은 롤 컷으로 붙인다.
/// 카메라 별명과 롤 메모에 '예시'를 붙여 실제 기록과 구분한다. 사진 앱에는 저장하지 않는다.
enum DemoSeed {
    @MainActor
    static func run(_ context: ModelContext) throws {
        let now = Date().timeIntervalSince1970 * 1000
        let d = 864e5
        func id() -> String { UUID().uuidString.lowercased() }
        func day(_ s: String) -> Double {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withFullDate, .withTime, .withColonSeparatorInTime, .withDashSeparatorInDate]
            f.timeZone = TimeZone(identifier: "Asia/Seoul")
            return (f.date(from: s) ?? Date()).timeIntervalSince1970 * 1000
        }
        let x700 = id(), rc = id(), xa = id(), lens50 = id(), lens28 = id()
        let uv = id(), y2 = id(), nd = id(), strap = id()
        let loaded = id(), finished = id(), atLab = id(), imported = id()

        func shot(_ pos: Int, _ aperture: Double, _ shutter: Double, _ ev: Double, _ extra: [String: Any] = [:]) -> [String: Any] {
            var s: [String: Any] = ["pos": pos, "order": pos, "mode": "A", "aperture": aperture, "shutter": shutter, "comp": 0, "flash": false,
                                    "ev": ev, "focal": 50, "at": ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: (now - 2 * d + Double(pos) * 6e5) / 1000)),
                                    "edited": false]
            s.merge(extra) { _, b in b }
            return s
        }
        let data: [String: Any] = [
            "cameras": [
                ["id": x700, "brand": "Minolta", "model": "X-700", "nickname": "예시", "format": "135", "mount": "Minolta MD", "style": "slr",
                 "color": "#1C1C1E", "battery": "SR44 ×2", "batteryAt": now - 120 * d, "tags": ["SLR"], "purchasedAt": day("2025-03-14T12:00:00"),
                 "price": "180,000", "seller": "중고 카메라 가게", "createdAt": now, "sortOrder": 1,
                 "accessoryIds": [uv, y2, nd, strap], "lensIds": [lens50, lens28], "lensesChosen": true],
                ["id": rc, "brand": "Olympus", "model": "35 RC", "nickname": "예시", "format": "135", "fixedLens": "Zuiko 42mm f/2.8", "style": "rangefinder",
                 "color": "#C9C9C4", "battery": "PX625 (1.35V)", "tags": ["RF"], "purchasedAt": day("2025-06-02T12:00:00"), "price": "150,000",
                 "seller": "중고 거래", "createdAt": now + 1, "sortOrder": 2],
                ["id": xa, "brand": "Olympus", "model": "XA", "nickname": "예시", "format": "135", "fixedLens": "F.Zuiko 35mm f/2.8", "style": "compact",
                 "color": "#1C1C1E", "battery": "SR44 ×2", "tags": ["똑딱이"], "purchasedAt": day("2025-09-10T12:00:00"), "price": "120,000",
                 "seller": "중고 거래", "createdAt": now + 2, "sortOrder": 3],
            ],
            "lenses": [
                ["id": lens50, "brand": "Minolta", "model": "MD Rokkor 50mm f/1.7", "mount": "Minolta MD", "focalMin": 50, "focalMax": 50,
                 "apertureOpen": "1.7", "apertureClose": "16", "price": "40,000", "purchasedAt": day("2025-03-14T12:00:00"), "createdAt": now],
                ["id": lens28, "brand": "Minolta", "model": "MD 28mm f/2.8", "mount": "Minolta MD", "focalMin": 28, "focalMax": 28,
                 "apertureOpen": "2.8", "apertureClose": "22", "price": "60,000", "purchasedAt": day("2025-08-21T12:00:00"), "tags": ["광각"], "createdAt": now + 1],
            ],
            "filters": [
                ["id": uv, "kind": "필터", "name": "UV", "diameter": "55", "price": "15,000", "createdAt": now],
                ["id": y2, "kind": "필터", "name": "Y2", "diameter": "55", "glass": "yellow", "price": "22,000", "tags": ["흑백"], "createdAt": now + 1],
                ["id": nd, "kind": "필터", "name": "ND8", "diameter": "55", "glass": "nd", "price": "28,000", "createdAt": now + 2],
                ["id": strap, "kind": "스트랩", "name": "가죽 스트랩", "price": "25,000", "createdAt": now + 3],
            ],
            "filmLots": [
                ["id": id(), "filmId": "kodak-portra-400", "format": "135", "count": 4, "lowAt": 1, "storage": "fridge", "expiresAt": now + 400 * d, "price": "23,000", "createdAt": now],
                ["id": id(), "filmId": "ilford-hp5-plus", "format": "135", "count": 1, "lowAt": 2, "storage": "drawer", "expiresAt": now + 700 * d, "price": "14,000", "createdAt": now + 1],
                ["id": id(), "filmId": "kodak-gold-200", "format": "135", "count": 2, "lowAt": 1, "storage": "room", "expiresAt": now - 40 * d, "price": "13,000", "createdAt": now + 2],
            ],
            "rolls": [
                ["id": loaded, "cameraId": x700, "lensId": lens50, "filmId": "kodak-portra-400", "status": "loaded", "loadedAt": now - 3 * d,
                 "lensChanges": [["id": id(), "startFrame": 9, "lensId": lens28]],
                 "meterShots": [shot(1, 5.6, 1.0 / 250, 13), shot(2, 8, 1.0 / 125, 13, ["filters": ["UV"]]), shot(3, 2.8, 1.0 / 60, 9, ["memo": "골목 그늘"]),
                                shot(9, 11, 1.0 / 500, 15, ["focal": 28, "tags": ["풍경"]])],
                 "days": [["id": id(), "startedAt": now - 3 * d, "startFrame": 1], ["id": id(), "startedAt": now - 1 * d, "startFrame": 9]],
                 "locations": [["id": id(), "startFrame": 1, "name": "망원동", "point": ["latitude": 37.5556, "longitude": 126.9019], "weather": ["code": 1, "temperature": 17]],
                               ["id": id(), "startFrame": 9, "name": "한강공원", "point": ["latitude": 37.5531, "longitude": 126.8960], "weather": ["code": 0, "temperature": 19]]],
                 "favorite": false, "isArchive": false, "note": "예시 롤 · 노출계 기록이 있어요"],
                ["id": finished, "cameraId": xa, "filmId": "kodak-gold-200", "status": "finished", "loadedAt": day("2026-10-05T10:00:00"), "finishedAt": day("2026-10-19T18:00:00"),
                 "days": [["id": id(), "startedAt": day("2026-10-05T10:00:00"), "startFrame": 1]],
                 "locations": [["id": id(), "startFrame": 1, "name": "연남동", "point": ["latitude": 37.5626, "longitude": 126.9254]]],
                 "favorite": false, "isArchive": false, "note": "예시 롤 · 현상소를 골라 보세요"],
                ["id": atLab, "cameraId": rc, "filmId": "ilford-hp5-plus", "status": "atLab", "loadedAt": day("2026-09-20T11:00:00"),
                 "days": [["id": id(), "startedAt": day("2026-09-20T11:00:00"), "startFrame": 1], ["id": id(), "startedAt": day("2026-09-27T15:30:00"), "startFrame": 19]],
                 "locations": [["id": id(), "startFrame": 1, "name": "성수동", "point": ["latitude": 37.5446, "longitude": 127.0559]],
                               ["id": id(), "startFrame": 19, "name": "서울숲", "point": ["latitude": 37.5444, "longitude": 127.0374], "memo": "산책"]],
                 "lab": "예시 현상소", "droppedAt": day("2026-10-01T10:00:00"), "finishedAt": day("2026-10-01T10:00:00"),
                 "favorite": false, "isArchive": false, "note": "예시 롤 · 스캔을 불러와 보세요"],
                ["id": imported, "cameraId": x700, "lensId": lens50, "filmId": "ilford-hp5-plus", "status": "imported", "loadedAt": day("2026-08-09T10:00:00"),
                 "title": "망원동 산책", "tags": ["흑백", "동네"], "favorite": true, "isArchive": false, "coverIndex": 2,
                 "note": "예시 롤 · 사진을 눌러 크게 보고, 밀착 인화·액자로 저장도 해 보세요", "noteInList": true,
                 "days": [["id": id(), "startedAt": day("2026-08-09T10:00:00"), "startFrame": 1]],
                 "locations": [["id": id(), "startFrame": 1, "name": "망원동", "point": ["latitude": 37.5556, "longitude": 126.9019], "weather": ["code": 2, "temperature": 27]]],
                 "lab": "예시 현상소", "droppedAt": day("2026-08-12T10:00:00"), "finishedAt": day("2026-08-11T20:00:00"), "importedAt": day("2026-08-16T12:00:00"),
                 "scanner": "Noritsu HS-1800", "frameCount": 36],
            ],
            "projects": [["id": id(), "name": "동네 기록", "memo": "예시 프로젝트", "color": 3, "archived": false, "createdAt": now, "rollIds": [imported, atLab]]],
        ]
        let backup: [String: Any] = ["kind": "filmchest-backup-web", "version": 1, "from": "demo", "data": data]
        _ = try WebFormat.merge(try JSONSerialization.data(withJSONObject: backup), into: context)

        // 예시 사진: 사진 앱 대신 앱 안 기록에만 (컷 썸네일)
        guard let roll = try context.fetch(FetchDescriptor<RollItem>()).first(where: { $0.id.uuidString.lowercased() == imported }) else { return }
        let start = Date(timeIntervalSince1970: day("2026-08-09T10:00:00") / 1000)
        for i in 1...7 {
            guard let url = Bundle.main.url(forResource: String(format: "hp5-%02d", i), withExtension: "jpg", subdirectory: "Demo")
                    ?? Bundle.main.url(forResource: String(format: "hp5-%02d", i), withExtension: "jpg"),
                  let bytes = try? Data(contentsOf: url) else { continue }
            let thumb = ImageThumbnail.make(data: bytes, maxPixel: 1200).flatMap { ImageEncoder.data($0, quality: 0.85) } ?? bytes
            let frame = FrameItem(index: i, assetIdentifier: nil, thumbnail: thumb, takenAt: start.addingTimeInterval(Double(i - 1) * 900), locationName: "망원동")
            frame.byteSize = Int64(bytes.count)
            frame.roll = roll
            context.insert(frame)
        }
        try context.save()
    }
}
