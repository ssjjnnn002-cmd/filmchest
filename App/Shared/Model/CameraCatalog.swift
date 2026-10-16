import Foundation
import FilmScanCore

/// 앱이 알고 있는 필름 카메라. 고르면 형태/포맷/마운트/렌즈/배터리를 자동으로 채운다.
/// 배터리는 확실한 것만 넣었고, 모르는 건 비워 두었다 (사용자가 직접 입력).
struct CatalogCamera: Identifiable, Hashable {
    let brand: String
    let model: String
    let style: CameraBodyStyle
    let format: FilmFormat
    let mount: String?        // 렌즈 교환식이면 마운트
    let lens: String?         // 렌즈 일체형이면 렌즈
    let battery: String?      // nil = 정보 없음
    var aka: [String] = []    // 다른 이름 (예: AF600 → Lite Touch, AF35M → 오토보이)

    var id: String { "\(brand) \(model)" }
    var displayName: String { "\(brand) \(model)" }
    var isInterchangeable: Bool { mount != nil }

    /// 표시용 분류 (예: "SLR · 렌즈 교환식", "똑딱이 · 하프")
    var kindText: String {
        var parts = [style.displayName]
        if format == .halfFrame { parts.append("하프") }
        if format.is120 { parts.append(format.displayName) }
        parts.append(isInterchangeable ? "렌즈 교환식" : "렌즈 일체형")
        return parts.joined(separator: " · ")
    }
}

enum CameraCatalog {
    // 목록(all)은 catalog/cameras.mjs에서 생성한 CameraCatalogData.swift에 있다.

    static var brands: [String] {
        var seen = Set<String>()
        return all.map(\.brand).filter { seen.insert($0).inserted }.sorted()
    }

    /// 제조사 입력 자동완성
    static func brands(matching text: String) -> [String] {
        let q = text.trimmingCharacters(in: .whitespaces).lowercased()
        guard !q.isEmpty else { return [] }
        return brands.filter { $0.lowercased().hasPrefix(q) || $0.lowercased().contains(q) }
    }

    /// 모델 입력 자동완성 (제조사가 있으면 그 제조사 안에서)
    static func models(brand: String, matching text: String) -> [CatalogCamera] {
        let b = brand.trimmingCharacters(in: .whitespaces).lowercased()
        let q = text.trimmingCharacters(in: .whitespaces).lowercased().replacingOccurrences(of: " ", with: "")
        func norm(_ s: String) -> String { s.lowercased().replacingOccurrences(of: " ", with: "") }
        // 다른 이름(별칭)으로도 찾는다. 제조사를 안 썼으면 "브랜드+모델"로도 찾는다.
        return all.filter { cam in
            (b.isEmpty || cam.brand.lowercased() == b)
                && (q.isEmpty || norm(cam.model).contains(q) || cam.aka.contains { norm($0).contains(q) }
                    || (b.isEmpty && norm(cam.displayName).contains(q)))
        }
    }

    /// 정확히 일치하는 모델 (다른 이름 포함)
    static func match(brand: String, model: String) -> CatalogCamera? {
        func norm(_ s: String) -> String { s.lowercased().replacingOccurrences(of: " ", with: "") }
        guard !model.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        let b = norm(brand), m = norm(model)
        return all.first { norm($0.brand) == b && (norm($0.model) == m || $0.aka.contains { norm($0) == m }) }
    }
}
