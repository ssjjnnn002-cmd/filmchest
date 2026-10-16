import Foundation
import ImageIO

public struct ScannerInfo: Sendable, Hashable {
    public let name: String          // 표시용 이름 (예: "Noritsu HS-1800")
    public let rawMake: String?
    public let rawModel: String?
    public let rawSoftware: String?
    public let pixelWidth: Int
    public let pixelHeight: Int
}

/// 스캔 파일의 EXIF/TIFF 정보로 스캐너 기종을 추정한다.
public enum ScannerDetector {
    public static func detect(fileURL: URL) -> ScannerInfo? {
        guard let source = CGImageSourceCreateWithURL(fileURL as CFURL, nil),
              let props = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] else { return nil }
        let tiff = props[kCGImagePropertyTIFFDictionary] as? [CFString: Any] ?? [:]
        let make = clean(tiff[kCGImagePropertyTIFFMake] as? String)
        let model = clean(tiff[kCGImagePropertyTIFFModel] as? String)
        let software = clean(tiff[kCGImagePropertyTIFFSoftware] as? String)
        let width = props[kCGImagePropertyPixelWidth] as? Int ?? 0
        let height = props[kCGImagePropertyPixelHeight] as? Int ?? 0

        guard let name = scannerName(make: make, model: model, software: software) else { return nil }
        return ScannerInfo(name: name, rawMake: make, rawModel: model, rawSoftware: software,
                           pixelWidth: width, pixelHeight: height)
    }

    static func scannerName(make: String?, model: String?, software: String?) -> String? {
        let all = [make, model, software].compactMap { $0 }.joined(separator: " ").uppercased()
        guard !all.isEmpty else { return nil }

        func modelSuffix() -> String { model.map { " \($0)" } ?? "" }

        if all.contains("NORITSU") || all.contains("EZ CONTROLLER") {
            // EZ Controller는 스캔 소프트웨어 이름이라 기종(HS-1800, LS-600 등)은 알 수 없다
            if let model, model.uppercased().contains("EZ CONTROLLER") { return "Noritsu · EZ Controller" }
            if let model, !model.uppercased().contains("NORITSU") { return "Noritsu \(model)" }
            return model ?? "Noritsu"
        }
        if all.contains("FRONTIER") || all.contains("SP-3000") || all.contains("SP3000") || all.contains("SP-500")
            || all.contains("SP500") || all.contains("SP-2000") {
            let m = ["SP-3000", "SP3000", "SP-500", "SP500", "SP-2000"].first { all.contains($0) }
            return "Fujifilm Frontier" + (m.map { " \($0)" } ?? "")
        }
        if all.contains("IMACON") || all.contains("FLEXTIGHT") || all.contains("FLEXCOLOR") {
            return "Hasselblad Flextight" + modelSuffix().replacingOccurrences(of: " Flextight", with: "")
        }
        if all.contains("PAKON") { return "Kodak Pakon" + modelSuffix() }
        if all.contains("COOLSCAN") || (all.contains("NIKON") && all.contains("LS-")) { return "Nikon Coolscan" + modelSuffix() }
        if all.contains("EPSON") { return "Epson" + modelSuffix().replacingOccurrences(of: " EPSON", with: "") }
        if all.contains("PLUSTEK") { return "Plustek" + modelSuffix() }
        if all.contains("SILVERFAST") { return "SilverFast" + (model.map { " · \($0)" } ?? "") }
        if all.contains("VUESCAN") { return "VueScan" + (model.map { " · \($0)" } ?? "") }
        if all.contains("NEGATIVE LAB PRO") { return "Negative Lab Pro" }
        // 알 수 없는 장비지만 정보는 있다 → 그대로 보여준다
        return [make, model].compactMap { $0 }.joined(separator: " ").nilIfEmpty
    }

    private static func clean(_ s: String?) -> String? {
        s?.trimmingCharacters(in: .whitespacesAndNewlines.union(.controlCharacters)).nilIfEmpty
    }
}

extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
