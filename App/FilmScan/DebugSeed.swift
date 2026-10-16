#if DEBUG
import Foundation
import SwiftData
import FilmScanCore

/// 개발용: 실행 인자로 샘플 데이터를 넣고 가져오기를 바로 띄운다. 출시 빌드에는 포함되지 않는다.
///   -seedSample   : MINOLTA X-700 + 50mm f/1.7 + HP5 Plus(망원동) 롤을 '스캔 대기'로 등록
///   -importSample : 앱 Documents 폴더의 첫 zip으로 스캔 불러오기 시작
enum DebugSeed {
    @MainActor
    static func run(context: ModelContext, router: Router) {
        let args = ProcessInfo.processInfo.arguments
        var roll: RollItem?

        if args.contains("-seedSample") {
            let existing = (try? context.fetch(FetchDescriptor<RollItem>())) ?? []
            roll = existing.first { $0.filmStockID == "ilford-hp5-plus" && $0.status != .imported }
            if roll == nil {
                let camera = CameraItem(brand: "Minolta", model: "X-700", format: .f135, mount: "Minolta MD")
                camera.batteryType = "SR44 ×2"
                let lens = LensItem(brand: "Minolta", model: "MD 50mm f/1.7", mount: "Minolta MD")
                context.insert(camera)
                context.insert(lens)
                let r = RollItem(camera: camera, lens: lens, filmStockID: "ilford-hp5-plus")
                context.insert(r)
                let seoul = TimeZone(identifier: "Asia/Seoul")!
                var c = DateComponents(); c.year = 2026; c.month = 9; c.day = 28; c.hour = 14; c.minute = 20
                var cal = Calendar(identifier: .gregorian); cal.timeZone = seoul
                let day = cal.date(from: c)!
                r.loadedAt = day
                r.shootingDays = [ShootingDay(startedAt: day, timeZone: seoul, startFrame: 1)]
                r.locations = [LocationSegment(startFrame: 1, name: "망원동",
                                               point: GeoPoint(latitude: 37.5556, longitude: 126.9019))]
                r.labName = "샘플 현상소"
                r.droppedOffAt = cal.date(byAdding: .day, value: 5, to: day)
                r.finishedAt = r.droppedOffAt
                r.status = .atLab
                try? context.save()
                roll = r
            }
            router.tab = .pending
        }

        if args.contains("-importSample") {
            let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            let zip = (try? FileManager.default.contentsOfDirectory(at: docs, includingPropertiesForKeys: nil))?
                .first { $0.pathExtension.lowercased() == "zip" }
            if let zip { router.openZip(zip, roll: roll) }
        }
    }
}
#endif
