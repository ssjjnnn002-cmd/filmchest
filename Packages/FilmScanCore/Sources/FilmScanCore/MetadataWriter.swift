import Foundation
import ImageIO
import UniformTypeIdentifiers

/// 노출계에서 한 칸에 남겨 둔 설정. 필름 칸 번호와 같은 스캔 장에 넣는다.
public struct ExposureNote: Sendable, Hashable {
    public var aperture: Double?
    public var shutter: Double?
    /// 스톱. 0이면 보정 없음
    public var compensation: Double
    public var flash: Bool
    /// EXIF ExposureProgram. 1 수동, 2 자동, 3 조리개 우선, 4 셔터 우선. 0이면 쓰지 않는다
    public var program: Int

    public init(aperture: Double?, shutter: Double?, compensation: Double, flash: Bool, program: Int) {
        self.aperture = aperture
        self.shutter = shutter
        self.compensation = compensation
        self.flash = flash
        self.program = program
    }
}

/// 한 컷에 써 넣을 모든 정보
public struct FrameMetadata: Sendable {
    public var frame: Int
    public var frameCount: Int
    public var date: Date?          // nil이면 원본 날짜를 그대로 둔다 (촬영일을 모를 때)
    public var timeZone: TimeZone
    public var location: LocationSegment?
    public var camera: Camera?      // nil이면 원본 기기 정보를 그대로 둔다
    public var lens: Lens?
    public var film: FilmStock?
    public var shotISO: Int?
    public var labName: String?
    public var scannerName: String?
    /// 사진 앱에서 다시 찾을 때 쓰는 표식. 캡션 문장에는 넣지 않는다.
    public var rollID: UUID?
    /// 이 칸의 노출계 기록. 없으면 원본 노출 태그를 그대로 둔다.
    public var exposure: ExposureNote?

    public init(frame: Int, frameCount: Int, date: Date?, timeZone: TimeZone, location: LocationSegment?,
                camera: Camera?, lens: Lens?, film: FilmStock?, shotISO: Int?, labName: String?, scannerName: String?,
                rollID: UUID? = nil, exposure: ExposureNote? = nil) {
        self.frame = frame; self.frameCount = frameCount; self.date = date; self.timeZone = timeZone
        self.location = location; self.camera = camera; self.lens = lens; self.film = film
        self.shotISO = shotISO; self.labName = labName; self.scannerName = scannerName
        self.rollID = rollID
        self.exposure = exposure
    }

    /// 사진 앱 "캡션"에 들어갈 문장. 예: "Kodak Portra 400 · 12/36 · 성수동 · 동네현상소 · Noritsu HS-1800"
    public var caption: String {
        [film?.displayName, "\(frame)/\(frameCount)", location?.name, location?.memo, labName, scannerName]
            .compactMap { $0?.nilIfEmpty }
            .joined(separator: " · ")
    }

    public var keywords: [String] {
        var k = ["필름"]
        if let camera { k.append(camera.displayName) }
        if let film { k += [film.displayName, film.process.rawValue] }
        if let lens { k.append(lens.displayName) }
        if let name = location?.name.nilIfEmpty { k.append(name) }
        if let labName = labName?.nilIfEmpty { k.append(labName) }
        if let scannerName = scannerName?.nilIfEmpty { k.append(scannerName) }
        if let rollID { k.append("filmchest:\(rollID.uuidString):\(frame)") }
        return k
    }

    var lensName: String? { lens?.displayName ?? camera?.fixedLensName }
    var iso: Int? { shotISO ?? film?.iso }
}

public enum MetadataWriterError: Error {
    case cannotRead(URL)
    case cannotWrite(URL)
}

/// 스캔 파일의 화질은 그대로 두고 메타데이터만 바꿔 새 파일로 저장한다.
public enum MetadataWriter {
    public static func write(source: URL, destination: URL, metadata m: FrameMetadata) throws {
        guard let src = CGImageSourceCreateWithURL(source as CFURL, nil),
              let type = CGImageSourceGetType(src) else { throw MetadataWriterError.cannotRead(source) }

        let meta: CGMutableImageMetadata = CGImageSourceCopyMetadataAtIndex(src, 0, nil)
            .flatMap { CGImageMetadataCreateMutableCopy($0) } ?? CGImageMetadataCreateMutable()

        func set(_ dict: CFString, _ key: CFString, _ value: Any?) {
            guard let value else { return }
            CGImageMetadataSetValueMatchingImageProperty(meta, dict, key, value as CFTypeRef)
        }

        // 날짜: 촬영 현지 시각 + 시차.
        // ImageIO는 EXIF DateTimeOriginal을 XMP photoshop:DateCreated(ISO 8601)로 다룬다.
        // 스캔 날짜(DateTimeDigitized = xmp:CreateDate)는 "스캔일"로 그대로 남긴다.
        if let date = m.date {
            let offset = offsetString(m.timeZone, at: date)
            let isoDate = formatter("yyyy-MM-dd'T'HH:mm:ss", m.timeZone).string(from: date) + offset
            CGImageMetadataRemoveTagWithPath(meta, nil, "photoshop:DateCreated" as CFString)
            CGImageMetadataSetValueWithPath(meta, nil, "photoshop:DateCreated" as CFString, isoDate as CFString)
            set(kCGImagePropertyExifDictionary, kCGImagePropertyExifOffsetTimeOriginal, offset)
        }

        // 카메라 / 렌즈 / ISO (모르면 원본 그대로)
        if let camera = m.camera {
            set(kCGImagePropertyTIFFDictionary, kCGImagePropertyTIFFMake, camera.brand)
            set(kCGImagePropertyTIFFDictionary, kCGImagePropertyTIFFModel, camera.model)
        }
        if let lens = m.lens {
            set(kCGImagePropertyExifDictionary, kCGImagePropertyExifLensMake, lens.brand)
            set(kCGImagePropertyExifDictionary, kCGImagePropertyExifLensModel, lens.model)
        } else if let fixed = m.camera?.fixedLensName {
            set(kCGImagePropertyExifDictionary, kCGImagePropertyExifLensModel, fixed)
        }
        if let iso = m.iso {
            set(kCGImagePropertyExifDictionary, kCGImagePropertyExifISOSpeedRatings, [iso])
        }
        set(kCGImagePropertyTIFFDictionary, kCGImagePropertyTIFFSoftware, m.scannerName)

        // 캡션 / 키워드
        set(kCGImagePropertyTIFFDictionary, kCGImagePropertyTIFFImageDescription, m.caption)
        set(kCGImagePropertyIPTCDictionary, kCGImagePropertyIPTCCaptionAbstract, m.caption)
        set(kCGImagePropertyIPTCDictionary, kCGImagePropertyIPTCKeywords, m.keywords)
        set(kCGImagePropertyIPTCDictionary, kCGImagePropertyIPTCObjectName, m.location?.name)

        // 위치
        if let p = m.location?.point {
            set(kCGImagePropertyGPSDictionary, kCGImagePropertyGPSLatitude, abs(p.latitude))
            set(kCGImagePropertyGPSDictionary, kCGImagePropertyGPSLatitudeRef, p.latitude >= 0 ? "N" : "S")
            set(kCGImagePropertyGPSDictionary, kCGImagePropertyGPSLongitude, abs(p.longitude))
            set(kCGImagePropertyGPSDictionary, kCGImagePropertyGPSLongitudeRef, p.longitude >= 0 ? "E" : "W")
            if let alt = p.altitude {
                set(kCGImagePropertyGPSDictionary, kCGImagePropertyGPSAltitude, abs(alt))
                set(kCGImagePropertyGPSDictionary, kCGImagePropertyGPSAltitudeRef, alt >= 0 ? 0 : 1)
            }
        }

        guard let dest = CGImageDestinationCreateWithURL(destination as CFURL, type, 1, nil) else {
            throw MetadataWriterError.cannotWrite(destination)
        }

        // 1순위: 재압축 없이 메타데이터만 교체 (JPEG/TIFF/PNG)
        var error: Unmanaged<CFError>?
        let options: [CFString: Any] = [kCGImageDestinationMetadata: meta,
                                        kCGImageDestinationMergeMetadata: false]
        if CGImageDestinationCopyImageSource(dest, src, options as CFDictionary, &error) {
            if let exposure = m.exposure { try stampExposure(at: destination, exposure) }
            return
        }

        // 2순위: 지원하지 않는 포맷이면 최고 화질로 다시 저장
        guard let fallback = CGImageDestinationCreateWithURL(destination as CFURL, type, 1, nil) else {
            throw MetadataWriterError.cannotWrite(destination)
        }
        guard let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { throw MetadataWriterError.cannotRead(source) }
        CGImageDestinationAddImageAndMetadata(fallback, image, meta,
                                              [kCGImageDestinationLossyCompressionQuality: 1.0] as CFDictionary)
        guard CGImageDestinationFinalize(fallback) else { throw MetadataWriterError.cannotWrite(destination) }
        if let exposure = m.exposure { try stampExposure(at: destination, exposure) }
    }

    /// 메타데이터 교체로는 조리개·셔터 소수점이 잘려서, 방금 쓴 파일에 노출만 다시 심는다. 이미지 데이터는 다시 압축하지 않는다.
    static func stampExposure(at url: URL, _ exposure: ExposureNote) throws {
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let type = CGImageSourceGetType(src) else { throw MetadataWriterError.cannotRead(url) }
        let tmp = url.deletingLastPathComponent().appendingPathComponent(url.lastPathComponent + ".exp")
        guard let dest = CGImageDestinationCreateWithURL(tmp as CFURL, type, 1, nil) else {
            throw MetadataWriterError.cannotWrite(url)
        }
        var props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any] ?? [:]
        var exif = props[kCGImagePropertyExifDictionary] as? [CFString: Any] ?? [:]
        if let aperture = exposure.aperture, aperture > 0 { exif[kCGImagePropertyExifFNumber] = aperture }
        if let shutter = exposure.shutter, shutter > 0 { exif[kCGImagePropertyExifExposureTime] = shutter }
        if exposure.compensation != 0 { exif[kCGImagePropertyExifExposureBiasValue] = exposure.compensation }
        exif[kCGImagePropertyExifFlash] = exposure.flash ? 1 : 0
        if exposure.program > 0 { exif[kCGImagePropertyExifExposureProgram] = exposure.program }
        props[kCGImagePropertyExifDictionary] = exif
        CGImageDestinationAddImageFromSource(dest, src, 0, props as CFDictionary)
        guard CGImageDestinationFinalize(dest) else {
            try? FileManager.default.removeItem(at: tmp)
            throw MetadataWriterError.cannotWrite(url)
        }
        _ = try FileManager.default.replaceItemAt(url, withItemAt: tmp)
    }

    static func formatter(_ format: String, _ timeZone: TimeZone) -> DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = timeZone
        f.dateFormat = format
        return f
    }

    static func offsetString(_ tz: TimeZone, at date: Date) -> String {
        let seconds = tz.secondsFromGMT(for: date)
        let sign = seconds >= 0 ? "+" : "-"
        let a = abs(seconds)
        return String(format: "%@%02d:%02d", sign, a / 3600, (a % 3600) / 60)
    }
}
