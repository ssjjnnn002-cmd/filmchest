import Foundation
import Testing
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
@testable import FilmScanCore

let seoul = TimeZone(identifier: "Asia/Seoul")!

func date(_ s: String) -> Date {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd HH:mm"
    f.timeZone = seoul
    return f.date(from: s)!
}

/// 단색 JPEG 하나를 만든다 (현상소 스캔 흉내: 스캐너 EXIF + 스캔 날짜)
func makeScan(at url: URL, width: Int = 300, height: Int = 200) {
    let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.setFillColor(CGColor(srgbRed: 0.8, green: 0.5, blue: 0.3, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
    let props: [CFString: Any] = [
        kCGImagePropertyTIFFDictionary: [kCGImagePropertyTIFFMake: "NORITSU KOKI", kCGImagePropertyTIFFModel: "HS-1800"],
        kCGImagePropertyExifDictionary: [kCGImagePropertyExifDateTimeOriginal: "2026:10:13 15:02:11",
                                         kCGImagePropertyExifDateTimeDigitized: "2026:10:13 15:02:11"],
    ]
    let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, ctx.makeImage()!, props as CFDictionary)
    CGImageDestinationFinalize(dest)
}

func tempDir() throws -> URL {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("filmscan-test-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    return url
}

func zipFolder(_ folder: URL, to zip: URL) throws {
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/zip")
    p.currentDirectoryURL = folder.deletingLastPathComponent()
    p.arguments = ["-q", "-r", zip.path, folder.lastPathComponent]
    try p.run()
    p.waitUntilExit()
}

@Suite struct ZipTests {
    @Test func decodesKoreanCP949FileName() {
        // "스캔.jpg"를 CP949로 인코딩한 바이트
        let cp949 = String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(
            CFStringEncoding(CFStringEncodings.dosKorean.rawValue)))
        let bytes = "스캔.jpg".data(using: cp949)!
        #expect(ZipArchive.decodeFileName(bytes, utf8Flag: false) == "스캔.jpg")
        #expect(ZipArchive.decodeFileName("스캔.jpg".data(using: .utf8)!, utf8Flag: true) == "스캔.jpg")
    }

    @Test func importsAndOrdersFramesNaturally() throws {
        let dir = try tempDir()
        let roll = dir.appendingPathComponent("roll")
        try FileManager.default.createDirectory(at: roll, withIntermediateDirectories: true)
        // 크기를 일부러 뒤섞고, 자연 정렬이 필요한 이름을 쓴다
        for n in [1, 2, 10, 11, 3] {
            makeScan(at: roll.appendingPathComponent("F\(n).jpg"), width: 200 + (n * 37) % 90, height: 150)
        }
        try Data("ignore".utf8).write(to: roll.appendingPathComponent(".DS_Store"))
        let zip = dir.appendingPathComponent("scan.zip")
        try zipFolder(roll, to: zip)

        let result = try ScanImporter.importZip(at: zip)
        #expect(result.primary.frames.map(\.originalName) == ["roll/F1.jpg", "roll/F2.jpg", "roll/F3.jpg", "roll/F10.jpg", "roll/F11.jpg"])
        #expect(result.primary.frames.map(\.index) == [1, 2, 3, 4, 5])
        // CRC가 맞고 이미지로 읽힌다
        #expect(CGImageSourceCreateWithURL(result.primary.frames[0].fileURL as CFURL, nil) != nil)
    }

    @Test func picksLargestSetWhenLabSendsTwoSizes() throws {
        let dir = try tempDir()
        let root = dir.appendingPathComponent("order")
        for (folder, w) in [("small", 120), ("large", 900)] {
            let f = root.appendingPathComponent(folder)
            try FileManager.default.createDirectory(at: f, withIntermediateDirectories: true)
            for n in 1...3 { makeScan(at: f.appendingPathComponent("\(n).jpg"), width: w, height: w * 2 / 3) }
        }
        let zip = dir.appendingPathComponent("scan.zip")
        try zipFolder(root, to: zip)
        let result = try ScanImporter.importZip(at: zip)
        #expect(result.primary.label.hasPrefix("order/large"))
        #expect(result.alternatives.count == 1)
    }
}

@Suite struct TimelineTests {
    @Test func evenlySplitsDaysWithoutStartFrames() {
        let days = (0..<3).map { ShootingDay(startedAt: date("2026-09-0\($0 + 1) 10:00"), timeZone: seoul) }
        #expect(FrameTimeline.startFrames(for: days, frameCount: 36) == [1, 13, 25])
    }

    @Test func respectsKnownStartFrames() {
        let days = [ShootingDay(startedAt: date("2026-09-01 10:00"), timeZone: seoul),
                    ShootingDay(startedAt: date("2026-09-02 10:00"), timeZone: seoul),
                    ShootingDay(startedAt: date("2026-09-05 10:00"), timeZone: seoul, startFrame: 30)]
        #expect(FrameTimeline.startFrames(for: days, frameCount: 36) == [1, 15, 30])
    }

    @Test func assignsDatesAndLocationsPerFrame() {
        let roll = Roll(cameraID: UUID(), filmStockID: "kodak-portra-400",
                        shootingDays: [ShootingDay(startedAt: date("2026-09-27 14:10"), timeZone: seoul),
                                       ShootingDay(startedAt: date("2026-10-03 10:30"), timeZone: seoul, startFrame: 21)],
                        locations: [LocationSegment(startFrame: 1, name: "성수동"),
                                    LocationSegment(startFrame: 13, name: "서울숲")])
        let t = FrameTimeline.build(roll: roll, frameCount: 36)
        #expect(t.count == 36)
        #expect(t[0].date == date("2026-09-27 14:10"))
        #expect(t[1].date == date("2026-09-27 14:11"))
        #expect(t[20].date == date("2026-10-03 10:30"))
        #expect(t[11].location?.name == "성수동")
        #expect(t[12].location?.name == "서울숲")
        // 순서가 항상 증가해야 사진 앱에서 촬영 순서가 유지된다
        #expect(zip(t, t.dropFirst()).allSatisfy { $0.date < $1.date })
    }

    @Test func compressesStepNearMidnight() {
        let roll = Roll(cameraID: UUID(), filmStockID: "x",
                        shootingDays: [ShootingDay(startedAt: date("2026-09-27 23:50"), timeZone: seoul)])
        let t = FrameTimeline.build(roll: roll, frameCount: 36)
        var cal = Calendar(identifier: .gregorian); cal.timeZone = seoul
        #expect(cal.isDate(t.last!.date, inSameDayAs: t.first!.date))
        #expect(zip(t, t.dropFirst()).allSatisfy { $0.date < $1.date })
    }
}

@Suite struct MetadataTests {
    @Test func writesCaptureInfoAndKeepsScanDate() throws {
        let dir = try tempDir()
        let src = dir.appendingPathComponent("in.jpg"), out = dir.appendingPathComponent("out.jpg")
        makeScan(at: src)
        let camera = Camera(brand: "Nikon", model: "FM2", mount: "Nikon F")
        let meta = FrameMetadata(frame: 3, frameCount: 36, date: date("2026-09-27 14:12"), timeZone: seoul,
                                 location: LocationSegment(startFrame: 1, name: "성수동",
                                                           point: GeoPoint(latitude: 37.5446, longitude: 127.0559)),
                                 camera: camera, lens: Lens(brand: "Nikon", model: "50mm f/1.4", mount: "Nikon F"),
                                 film: FilmStockCatalog.stock(id: "kodak-portra-400"), shotISO: 800,
                                 labName: "동네현상소", scannerName: "Noritsu HS-1800")
        try MetadataWriter.write(source: src, destination: out, metadata: meta)

        let p = CGImageSourceCopyPropertiesAtIndex(CGImageSourceCreateWithURL(out as CFURL, nil)!, 0, nil) as! [CFString: Any]
        let exif = p[kCGImagePropertyExifDictionary] as! [CFString: Any]
        let tiff = p[kCGImagePropertyTIFFDictionary] as! [CFString: Any]
        let gps = p[kCGImagePropertyGPSDictionary] as! [CFString: Any]
        let iptc = p[kCGImagePropertyIPTCDictionary] as! [CFString: Any]
        #expect(exif[kCGImagePropertyExifDateTimeOriginal] as? String == "2026:09:27 14:12:00")
        #expect(exif[kCGImagePropertyExifOffsetTimeOriginal] as? String == "+09:00")
        #expect(exif[kCGImagePropertyExifDateTimeDigitized] as? String == "2026:10:13 15:02:11")
        #expect(tiff[kCGImagePropertyTIFFModel] as? String == "FM2")
        #expect(exif[kCGImagePropertyExifISOSpeedRatings] as? [Int] == [800])
        #expect(gps[kCGImagePropertyGPSLatitudeRef] as? String == "N")
        #expect((iptc[kCGImagePropertyIPTCKeywords] as? [String])?.contains("Kodak Portra 400") == true)
        #expect((iptc[kCGImagePropertyIPTCCaptionAbstract] as? String)?.contains("3/36") == true)
    }

    @Test func writesExposureOntoTheMatchingFrame() throws {
        let dir = try tempDir()
        let src = dir.appendingPathComponent("in.jpg"), out = dir.appendingPathComponent("out.jpg")
        makeScan(at: src)
        let exposure = ExposureNote(aperture: 2.8, shutter: 1.0 / 125, compensation: 1.0 / 3, flash: false, program: 3)
        let meta = FrameMetadata(frame: 1, frameCount: 36, date: nil, timeZone: seoul, location: nil, camera: nil,
                                 lens: nil, film: nil, shotISO: nil, labName: nil, scannerName: nil, exposure: exposure)
        try MetadataWriter.write(source: src, destination: out, metadata: meta)
        let p = CGImageSourceCopyPropertiesAtIndex(CGImageSourceCreateWithURL(out as CFURL, nil)!, 0, nil) as! [CFString: Any]
        let exif = p[kCGImagePropertyExifDictionary] as! [CFString: Any]
        let fNumber = (exif[kCGImagePropertyExifFNumber] as? NSNumber)?.doubleValue ?? -1
        let shutter = (exif[kCGImagePropertyExifExposureTime] as? NSNumber)?.doubleValue ?? -1
        let bias = (exif[kCGImagePropertyExifExposureBiasValue] as? NSNumber)?.doubleValue ?? -1
        #expect(abs(fNumber - 2.8) < 0.05)
        #expect(abs(shutter - (1.0 / 125)) < 0.001)
        #expect(abs(bias - (1.0 / 3)) < 0.02)
        #expect(exif[kCGImagePropertyExifExposureProgram] as? Int == 3)
        #expect(exif[kCGImagePropertyExifFlash] as? Int == 0)
    }

    @Test func decodesSegmentsSavedBeforeMemoExisted() throws {
        let old = #"{"id":"6F9619FF-8B86-D011-B42D-00C04FC964FF","startFrame":3,"name":"망원동"}"#
        let seg = try JSONDecoder().decode(LocationSegment.self, from: Data(old.utf8))
        #expect(seg.memo == nil && seg.point == nil && seg.startFrame == 3)
    }

    @Test func detectsScanners() {
        #expect(ScannerDetector.scannerName(make: "NORITSU KOKI", model: "HS-1800", software: nil) == "Noritsu HS-1800")
        #expect(ScannerDetector.scannerName(make: "NORITSU KOKI", model: "EZ Controller",
                                            software: "EZ Controller 6.60.031  (160615)") == "Noritsu · EZ Controller")
        #expect(ScannerDetector.scannerName(make: "FUJIFILM", model: "SP-3000", software: nil) == "Fujifilm Frontier SP-3000")
        #expect(ScannerDetector.scannerName(make: nil, model: nil, software: nil) == nil)
    }
}

@Suite struct RenderTests {
    @Test func rendersEveryCanister() {
        for stock in FilmStockCatalog.all {
            #expect(FilmCanisterRenderer.render(stock, size: 200) != nil)
        }
    }

    @Test func catalogIDsAreUnique() {
        #expect(Set(FilmStockCatalog.all.map(\.id)).count == FilmStockCatalog.all.count)
    }
}

@Suite struct UnknownInfoTests {
    @Test func keepsOriginalDateAndDeviceWhenUnknown() throws {
        let dir = try tempDir()
        let src = dir.appendingPathComponent("in.jpg"), out = dir.appendingPathComponent("out.jpg")
        makeScan(at: src)
        let meta = FrameMetadata(frame: 1, frameCount: 1, date: nil, timeZone: seoul, location: nil, camera: nil,
                                 lens: nil, film: nil, shotISO: nil, labName: nil, scannerName: nil)
        try MetadataWriter.write(source: src, destination: out, metadata: meta)
        let p = CGImageSourceCopyPropertiesAtIndex(CGImageSourceCreateWithURL(out as CFURL, nil)!, 0, nil) as! [CFString: Any]
        let exif = p[kCGImagePropertyExifDictionary] as! [CFString: Any]
        let tiff = p[kCGImagePropertyTIFFDictionary] as! [CFString: Any]
        #expect(exif[kCGImagePropertyExifDateTimeOriginal] as? String == "2026:10:13 15:02:11")
        #expect(tiff[kCGImagePropertyTIFFMake] as? String == "NORITSU KOKI")
    }

    @Test func importsLooseFilesInNameOrder() throws {
        let dir = try tempDir()
        let urls = ["10.jpg", "2.jpg", "1.jpg"].map { dir.appendingPathComponent($0) }
        urls.forEach { makeScan(at: $0) }
        let result = try ScanImporter.importFiles(urls)
        #expect(result.primary.frames.map(\.originalName) == ["1.jpg", "2.jpg", "10.jpg"])
    }
}
