import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import FilmScanCore

// 앱 없이 코어 로직을 시험하는 명령줄 도구
//   filmscan canisters <출력폴더>
//   filmscan make-sample <출력.zip 경로> <사진>...   (가짜 현상소 스캔 zip 만들기)
//   filmscan import <zip> <출력폴더>                  (가져오기 → 메타데이터 기록 → 밀착 인화)

let args = CommandLine.arguments.dropFirst()
let fm = FileManager.default

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

func save(_ image: CGImage, _ url: URL, type: UTType = .png) {
    guard let data = ImageEncoder.data(image, type: type) else { fail("인코딩 실패: \(url.path)") }
    try! data.write(to: url)
}

switch args.first {
case "canisters":
    guard let out = args.dropFirst().first else { fail("출력 폴더를 지정하세요") }
    let dir = URL(fileURLWithPath: out)
    try fm.createDirectory(at: dir, withIntermediateDirectories: true)
    let tile = 400
    let stocks = FilmStockCatalog.all
    let cols = 8
    let rows = Int((Double(stocks.count) / Double(cols)).rounded(.up))
    let sheet = CGContext(data: nil, width: cols * tile, height: rows * tile + tile / 2, bitsPerComponent: 8, bytesPerRow: 0,
                          space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    sheet.setFillColor(CGColor(srgbRed: 0.95, green: 0.94, blue: 0.92, alpha: 1))
    sheet.fill(CGRect(x: 0, y: 0, width: sheet.width, height: sheet.height))
    for (i, stock) in stocks.enumerated() {
        let image = FilmCanisterRenderer.render(stock, format: .f135, size: tile)!
        save(image, dir.appendingPathComponent("\(stock.id).png"))
        let x = (i % cols) * tile, y = sheet.height - (i / cols + 1) * tile
        sheet.draw(image, in: CGRect(x: x, y: y, width: tile, height: tile))
    }
    // 마지막 줄에 120 롤 예시
    for (i, id) in ["kodak-portra-400", "fuji-velvia-50", "ilford-hp5-plus", "kodak-ektar-100"].enumerated() {
        let image = FilmCanisterRenderer.render(FilmStockCatalog.stock(id: id)!, format: .f120_66, size: tile / 2)!
        sheet.draw(image, in: CGRect(x: i * tile / 2, y: 0, width: tile / 2, height: tile / 2))
    }
    save(sheet.makeImage()!, dir.appendingPathComponent("_gallery.png"))
    print("필름 \(stocks.count)종 → \(dir.path)")

case "make-sample":
    let rest = Array(args.dropFirst())
    guard rest.count >= 2 else { fail("사용법: make-sample <출력.zip> <사진>...") }
    let zipURL = URL(fileURLWithPath: rest[0])
    let sources = rest.dropFirst().compactMap { CGImageSourceCreateWithURL(URL(fileURLWithPath: $0) as CFURL, nil) }
        .compactMap { CGImageSourceCreateImageAtIndex($0, 0, nil) }
    guard !sources.isEmpty else { fail("사진을 읽을 수 없습니다") }

    let staging = fm.temporaryDirectory.appendingPathComponent("sample-\(UUID().uuidString)/R1_스캔", isDirectory: true)
    try fm.createDirectory(at: staging, withIntermediateDirectories: true)
    var rng = SystemRandomNumberGenerator()
    for frame in 1...36 {
        let base = sources[frame % sources.count]
        let portrait = frame % 7 == 3
        let aspect = portrait ? 2.0 / 3.0 : 3.0 / 2.0
        let cw = min(Double(base.width), Double(base.height) * aspect) * Double.random(in: 0.55...0.95, using: &rng)
        let ch = cw / aspect
        let cx = Double.random(in: 0...(Double(base.width) - cw), using: &rng)
        let cy = Double.random(in: 0...(Double(base.height) - ch), using: &rng)
        let crop = base.cropping(to: CGRect(x: cx, y: cy, width: cw, height: ch))!
        // 현상소 스캐너처럼 EXIF를 남긴다. 날짜는 '스캔한 날'.
        let props: [CFString: Any] = [
            kCGImagePropertyTIFFDictionary: [kCGImagePropertyTIFFMake: "NORITSU KOKI",
                                             kCGImagePropertyTIFFModel: "HS-1800",
                                             kCGImagePropertyTIFFSoftware: "EZ Controller"],
            kCGImagePropertyExifDictionary: [kCGImagePropertyExifDateTimeOriginal: "2026:10:13 15:02:11",
                                             kCGImagePropertyExifDateTimeDigitized: "2026:10:13 15:02:11"],
            kCGImageDestinationLossyCompressionQuality: 0.85,
        ]
        // 일부러 크기 순서가 뒤죽박죽이 되도록 파일명만 번호
        let url = staging.appendingPathComponent(String(format: "000%03d.JPG", frame))
        let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
        CGImageDestinationAddImage(dest, crop, props as CFDictionary)
        CGImageDestinationFinalize(dest)
    }
    try? fm.removeItem(at: zipURL)
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/ditto")
    p.arguments = ["-c", "-k", "--sequesterRsrc", "--keepParent", staging.path, zipURL.path]
    try p.run(); p.waitUntilExit()
    print("샘플 zip → \(zipURL.path)")

case "import":
    let rest = Array(args.dropFirst())
    guard rest.count >= 2 else { fail("사용법: import <zip> <출력폴더>") }
    let out = URL(fileURLWithPath: rest[1])
    try fm.createDirectory(at: out, withIntermediateDirectories: true)

    let result = try ScanImporter.importZip(at: URL(fileURLWithPath: rest[0]))
    let frames = result.primary.frames
    print("스캔 \(frames.count)장 (\(result.primary.label)), 다른 묶음 \(result.alternatives.count)개")
    let scanner = ScannerDetector.detect(fileURL: frames[0].fileURL)
    print("스캐너: \(scanner?.name ?? "알 수 없음")")

    // 미리 기록해 둔 롤이라고 가정
    let seoul = TimeZone(identifier: "Asia/Seoul")!
    func day(_ s: String) -> Date {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd HH:mm"; f.timeZone = seoul; return f.date(from: s)!
    }
    let camera = Camera(brand: "Nikon", model: "FM2", mount: "Nikon F")
    let lens = Lens(brand: "Nikon", model: "Nikkor 50mm f/1.4 AI-S", mount: "Nikon F")
    let film = FilmStockCatalog.stock(id: "kodak-portra-400")!
    let roll = Roll(cameraID: camera.id, lensID: lens.id, filmStockID: film.id, status: .atLab,
                    shootingDays: [ShootingDay(startedAt: day("2026-09-27 14:10"), timeZone: seoul),
                                   ShootingDay(startedAt: day("2026-10-03 10:30"), timeZone: seoul, startFrame: 21)],
                    locations: [LocationSegment(startFrame: 1, name: "성수동", point: GeoPoint(latitude: 37.5446, longitude: 127.0559)),
                                LocationSegment(startFrame: 13, name: "서울숲", point: GeoPoint(latitude: 37.5444, longitude: 127.0374)),
                                LocationSegment(startFrame: 21, name: "제주 협재", point: GeoPoint(latitude: 33.3940, longitude: 126.2397))],
                    labName: "동네현상소")

    let timeline = FrameTimeline.build(roll: roll, frameCount: frames.count)
    for (frame, info) in zip(frames, timeline) {
        let meta = FrameMetadata(frame: frame.index, frameCount: frames.count, date: info.date, timeZone: info.timeZone,
                                 location: info.location, camera: camera, lens: lens, film: film, shotISO: nil,
                                 labName: roll.labName, scannerName: scanner?.name)
        let ext = frame.fileURL.pathExtension
        try MetadataWriter.write(source: frame.fileURL, destination: out.appendingPathComponent(String(format: "%02d.%@", frame.index, ext)),
                                 metadata: meta)
    }

    let written = (1...frames.count).map { out.appendingPathComponent(String(format: "%02d.%@", $0, frames[0].fileURL.pathExtension)) }
    let header = "\(film.displayName)  ·  \(camera.displayName) + \(lens.model)  ·  2026.09.27 – 10.03  ·  \(roll.labName!)  ·  \(scanner?.name ?? "")"
    if let sheet = ContactSheetRenderer.render(frames: written, format: .f135, film: film,
                                               options: .init(pixelWidth: 3600, header: header)) {
        save(sheet, out.appendingPathComponent("contact-sheet.jpg"), type: .jpeg)
    }
    try? fm.removeItem(at: result.workingDirectory)
    print("완료 → \(out.path)")

case "icon":
    // 앱 아이콘: 암실 배경 위 필름 통 (특정 브랜드가 아닌 자체 디자인)
    guard let out = args.dropFirst().first else { fail("사용법: icon <출력.png>") }
    let S = 1024
    let ctx = CGContext(data: nil, width: S, height: S, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    let bg = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB),
                        colors: [CGColor(srgbRed: 0.20, green: 0.17, blue: 0.15, alpha: 1),
                                 CGColor(srgbRed: 0.07, green: 0.06, blue: 0.06, alpha: 1)] as CFArray, locations: [0, 1])!
    ctx.drawRadialGradient(bg, startCenter: CGPoint(x: S / 2, y: S * 6 / 10), startRadius: 0,
                           endCenter: CGPoint(x: S / 2, y: S / 2), endRadius: CGFloat(S) * 0.75, options: .drawsAfterEndLocation)
    let own = FilmStock(id: "filmchest", brand: "Filmchest", name: "필름함", iso: 36, process: .c41,
                        style: CanisterStyle(body: "#F2EEE4", band: "#DE542E", text: "#2A2522", bandText: "#FFFFFF"))
    let canister = FilmCanisterRenderer.render(own, format: .f135, size: 900)!
    ctx.draw(canister, in: CGRect(x: 90, y: 40, width: 900, height: 900))
    save(ctx.makeImage()!, URL(fileURLWithPath: out))
    print("아이콘 → \(out)")

case "scan":
    guard let path = args.dropFirst().first else { fail("사용법: scan <zip>") }
    let result = try ScanImporter.importZip(at: URL(fileURLWithPath: path))
    print("묶음: \(result.primary.label) · \(result.primary.frames.count)장 · \(result.primary.totalBytes / 1_000_000)MB")
    for alt in result.alternatives { print("다른 묶음: \(alt.label) · \(alt.frames.count)장") }
    if let s = ScannerDetector.detect(fileURL: result.primary.frames[0].fileURL) {
        print("스캐너: \(s.name) [make=\(s.rawMake ?? "-") model=\(s.rawModel ?? "-") software=\(s.rawSoftware ?? "-")] \(s.pixelWidth)×\(s.pixelHeight)")
    } else { print("스캐너: 감지 안 됨") }
    for f in result.primary.frames.prefix(3) + result.primary.frames.suffix(2) {
        print("  #\(f.index) \(f.originalName)")
    }
    try? fm.removeItem(at: result.workingDirectory)

case "inspect":
    for path in args.dropFirst() {
        guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
              let p = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any] else { continue }
        let exif = p[kCGImagePropertyExifDictionary] as? [CFString: Any] ?? [:]
        let tiff = p[kCGImagePropertyTIFFDictionary] as? [CFString: Any] ?? [:]
        let gps = p[kCGImagePropertyGPSDictionary] as? [CFString: Any] ?? [:]
        let iptc = p[kCGImagePropertyIPTCDictionary] as? [CFString: Any] ?? [:]
        print("== \((path as NSString).lastPathComponent)")
        print("  촬영일  \(exif[kCGImagePropertyExifDateTimeOriginal] ?? "-") \(exif[kCGImagePropertyExifOffsetTimeOriginal] ?? "")")
        print("  스캔일  \(exif[kCGImagePropertyExifDateTimeDigitized] ?? "-")")
        print("  카메라  \(tiff[kCGImagePropertyTIFFMake] ?? "-") \(tiff[kCGImagePropertyTIFFModel] ?? "-") / 렌즈 \(exif[kCGImagePropertyExifLensModel] ?? "-") / ISO \(exif[kCGImagePropertyExifISOSpeedRatings] ?? "-")")
        print("  위치    \(gps[kCGImagePropertyGPSLatitude] ?? "-")\(gps[kCGImagePropertyGPSLatitudeRef] ?? ""), \(gps[kCGImagePropertyGPSLongitude] ?? "-")\(gps[kCGImagePropertyGPSLongitudeRef] ?? "")")
        print("  캡션    \(iptc[kCGImagePropertyIPTCCaptionAbstract] ?? "-")")
        print("  키워드  \((iptc[kCGImagePropertyIPTCKeywords] as? [String])?.joined(separator: ", ") ?? "-")")
    }

default:
    print("사용법: filmscan canisters <폴더> | make-sample <zip> <사진>... | import <zip> <폴더>")
}
