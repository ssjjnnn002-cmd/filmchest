import Foundation
import CoreLocation
import Photos
import SwiftData
import ImageIO
import FilmScanCore

/// zip/파일 분석 결과 (저장 전 미리보기용)
struct ScanPreview: Sendable {
    let result: ScanImportResult
    let scanner: ScannerInfo?
    var frameCount: Int { result.primary.frames.count }
}

/// 저장할 때 필요한 롤 정보 스냅샷 (SwiftData 객체를 다른 스레드로 넘기지 않기 위해)
struct RollSnapshot: Sendable {
    let roll: Roll
    let camera: Camera?           // nil = 알 수 없음
    let lens: Lens?
    /// 중간에 바꿔 낀 렌즈 (시작 컷, 렌즈)
    var lensSteps: [LensStep] = []
    let film: FilmStock?
    let dateUnknown: Bool         // true면 원본 날짜를 그대로 둔다
    let albumTitle: String        // 롤마다 앨범일 때 이름
    let cameraAlbumTitle: String  // 카메라별 앨범일 때 이름
    let existingAlbumID: String?
    /// 필름 칸 번호 → 그 칸의 노출 기록
    var exposures: [Int: ExposureNote] = [:]
}

struct LensStep: Sendable {
    let startFrame: Int
    let lens: Lens
}

extension RollSnapshot {
    /// n번 컷의 렌즈
    func lens(at frame: Int) -> Lens? {
        lensSteps.sorted { $0.startFrame > $1.startFrame }.first { $0.startFrame <= frame }?.lens ?? lens
    }
}

struct ImportedFrame: Sendable {
    let index: Int
    let assetIdentifier: String
    let thumbnail: Data?
    let takenAt: Date?
    let locationName: String?
    let pixelWidth: Int?
    let pixelHeight: Int?
    let byteSize: Int64
    let format: String?
}

struct ImportOutcome: Sendable {
    let frames: [ImportedFrame]
    let albumIdentifier: String?
    let scannerName: String?
}

enum RollImporter {
    static func analyze(zipURL: URL) async throws -> ScanPreview {
        // 압축을 푼 폴더도 같은 길로
        if ScanFolder.isFolder(zipURL) { return try await analyze(files: ScanFolder.images(in: zipURL)) }
        return try await Task.detached(priority: .userInitiated) {
            let result = try ScanImporter.importZip(at: zipURL)
            return ScanPreview(result: result, scanner: detectScanner(result))
        }.value
    }

    /// zip이 아닌 낱장 이미지 파일들 (zip이 섞여 있으면 zip을 우선)
    static func analyze(files: [URL]) async throws -> ScanPreview {
        if let zip = files.first(where: { $0.pathExtension.lowercased() == "zip" }) {
            return try await analyze(zipURL: zip)
        }
        return try await Task.detached(priority: .userInitiated) {
            let result = try ScanImporter.importFiles(files)
            return ScanPreview(result: result, scanner: detectScanner(result))
        }.value
    }

    private static func detectScanner(_ result: ScanImportResult) -> ScannerInfo? {
        result.primary.frames.first.flatMap { ScannerDetector.detect(fileURL: $0.fileURL) }
    }

    /// 설정한 저장 방식에 맞는 앨범 (앨범 없이 저장이면 nil)
    static func targetAlbum(for snapshot: RollSnapshot) async throws -> PHAssetCollection? {
        switch AppSettings.albumMode {
        case .none:
            return nil
        case .single:
            return try await PhotoLibrary.album(titled: AlbumMode.singleAlbumTitle)
        case .perCamera:
            return try await PhotoLibrary.album(titled: snapshot.cameraAlbumTitle)
        case .perRoll:
            if let existing = PhotoLibrary.existingAlbum(id: snapshot.existingAlbumID) { return existing }
            return try await PhotoLibrary.album(titled: snapshot.albumTitle)
        }
    }

    /// 메타데이터를 기록하고 사진 앱에 순서대로 저장한다.
    static func save(preview: ScanPreview, using set: ScanSet? = nil, snapshot: RollSnapshot,
                     meterOffset: Int = 0, progress: @escaping @Sendable (Int, Int) -> Void) async throws -> ImportOutcome {
        try await PhotoLibrary.requestAccess()
        let frames = (set ?? preview.result.primary).frames
        let album = try await targetAlbum(for: snapshot)
        let timeline = FrameTimeline.build(roll: snapshot.roll, frameCount: frames.count)
        let outDir = preview.result.workingDirectory.appendingPathComponent("out", isDirectory: true)
        try FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
        let scannerName = snapshot.roll.scannerName ?? preview.scanner?.name

        var imported: [ImportedFrame] = []
        for (frame, info) in zip(frames, timeline) {
            try Task.checkCancellation()
            let date: Date? = snapshot.dateUnknown ? nil : info.date
            let meta = FrameMetadata(frame: frame.index, frameCount: frames.count, date: date, timeZone: info.timeZone,
                                     location: info.location, camera: snapshot.camera, lens: snapshot.lens(at: frame.index),
                                     film: snapshot.film, shotISO: snapshot.roll.shotISO,
                                     labName: snapshot.roll.labName, scannerName: scannerName,
                                     rollID: snapshot.roll.id, exposure: snapshot.exposures[frame.index - meterOffset])
            let ext = frame.fileURL.pathExtension
            let out = outDir.appendingPathComponent(String(format: "%02d.%@", frame.index, ext))
            try MetadataWriter.write(source: frame.fileURL, destination: out, metadata: meta)

            let location = info.location?.point.map {
                CLLocation(coordinate: CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude),
                           altitude: $0.altitude ?? 0, horizontalAccuracy: 50, verticalAccuracy: -1, timestamp: info.date)
            }
            let originalName = (frame.originalName as NSString).lastPathComponent
            let assetID = try await PhotoLibrary.add(fileURL: out, originalName: originalName, date: date,
                                                     location: location, to: album)
            let thumb = ImageThumbnail.make(url: out, maxPixel: 1200).flatMap { ImageEncoder.data($0, quality: 0.85) }
            let size = pixelSize(frame.fileURL)
            imported.append(ImportedFrame(index: frame.index, assetIdentifier: assetID, thumbnail: thumb,
                                          takenAt: date, locationName: info.location?.name,
                                          pixelWidth: size?.0, pixelHeight: size?.1, byteSize: Int64(frame.byteSize),
                                          format: ScanImporter.formatFamily(frame.originalName)))
            try? FileManager.default.removeItem(at: out)
            progress(frame.index, frames.count)
        }
        try? FileManager.default.removeItem(at: preview.result.workingDirectory)
        return ImportOutcome(frames: imported, albumIdentifier: album?.localIdentifier, scannerName: scannerName)
    }

    /// 이미 사진 앱에 있는 사진들을 롤로 묶는다. 복사하지 않고, 아는 정보(날짜/위치)만 고친다.
    static func link(assetIDs: [String], snapshot: RollSnapshot,
                     progress: @escaping @Sendable (Int, Int) -> Void) async throws -> ImportOutcome {
        try await PhotoLibrary.requestAccess()
        let album = try await targetAlbum(for: snapshot)
        let timeline = FrameTimeline.build(roll: snapshot.roll, frameCount: assetIDs.count)
        var imported: [ImportedFrame] = []
        for (i, (id, info)) in zip(assetIDs, timeline).enumerated() {
            try Task.checkCancellation()
            let date: Date? = snapshot.dateUnknown ? nil : info.date
            let location = info.location?.point.map {
                CLLocation(coordinate: CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude),
                           altitude: $0.altitude ?? 0, horizontalAccuracy: 50, verticalAccuracy: -1, timestamp: info.date)
            }
            let asset = try await PhotoLibrary.update(assetID: id, date: date, location: location, addTo: album)
            let thumb = await PhotoLibrary.image(assetID: id, maxPixel: 1200).flatMap { ImageEncoder.data($0, quality: 0.85) }
            imported.append(ImportedFrame(index: i + 1, assetIdentifier: id, thumbnail: thumb,
                                          takenAt: date ?? asset?.creationDate, locationName: info.location?.name,
                                          pixelWidth: asset?.pixelWidth, pixelHeight: asset?.pixelHeight, byteSize: 0,
                                          format: nil))
            progress(i + 1, assetIDs.count)
        }
        return ImportOutcome(frames: imported, albumIdentifier: album?.localIdentifier, scannerName: snapshot.roll.scannerName)
    }

    private static func pixelSize(_ url: URL) -> (Int, Int)? {
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let p = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
              let w = p[kCGImagePropertyPixelWidth] as? Int, let h = p[kCGImagePropertyPixelHeight] as? Int else { return nil }
        return (w, h)
    }

    static func discard(_ preview: ScanPreview) {
        try? FileManager.default.removeItem(at: preview.result.workingDirectory)
    }
}

extension RollItem {
    @MainActor
    func snapshot() -> RollSnapshot {
        let all = (try? modelContext?.fetch(FetchDescriptor<LensItem>())) ?? []
        let steps = lensChanges.compactMap { c in all.first { $0.id == c.lensID }.map { LensStep(startFrame: c.startFrame, lens: $0.core) } }
        let notes = Dictionary(meterShots.map { ($0.pos, $0.exposureNote) }, uniquingKeysWith: { _, last in last })
        return RollSnapshot(roll: coreRoll(), camera: camera?.core, lens: lens?.core, lensSteps: steps, film: film, dateUnknown: dateUnknown,
                            albumTitle: albumTitle, cameraAlbumTitle: cameraName,
                            existingAlbumID: albumIdentifier, exposures: notes)
    }

    @MainActor
    func apply(_ outcome: ImportOutcome) {
        for old in frames ?? [] { modelContext?.delete(old) }
        frames = outcome.frames.map {
            let f = FrameItem(index: $0.index, assetIdentifier: $0.assetIdentifier, thumbnail: $0.thumbnail,
                              takenAt: $0.takenAt, locationName: $0.locationName)
            f.pixelWidth = $0.pixelWidth
            f.pixelHeight = $0.pixelHeight
            f.byteSize = $0.byteSize > 0 ? $0.byteSize : nil
            return f
        }
        // 대표 해상도: 가장 많은 컷이 가진 크기
        let sizes = Dictionary(grouping: outcome.frames.compactMap { f in f.pixelWidth.map { ($0, f.pixelHeight ?? 0) } }) { "\($0.0)x\($0.1)" }
        if let common = sizes.max(by: { $0.value.count < $1.value.count })?.value.first {
            scanPixelWidth = common.0
            scanPixelHeight = common.1
        }
        scanFormat = outcome.frames.first?.format
        let bytes = outcome.frames.reduce(0) { $0 + $1.byteSize }
        scanBytes = bytes > 0 ? bytes : nil
        frameCount = outcome.frames.count
        albumIdentifier = outcome.albumIdentifier
        scannerName = outcome.scannerName
        importedAt = Date()
        status = .imported
    }
}
