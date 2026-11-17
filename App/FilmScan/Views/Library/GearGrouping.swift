import SwiftUI
import FilmScanCore

/// 묶어 보기 기준 (내 장비 카메라·필름 재고, 필름 고르기). 웹·갤럭시와 같은 이름·순서
enum GearGroup: String, CaseIterable, Identifiable {
    case none, tag, brand, type, iso, process, format
    var id: String { rawValue }

    var title: String {
        switch self {
        case .none: "묶지 않기"
        case .tag: "태그"
        case .brand: "브랜드"
        case .type: "유형"
        case .iso: "ISO"
        case .process: "종류"
        case .format: "규격"
        }
    }

    static let camera: [GearGroup] = [.none, .tag, .brand, .type]
    /// 내 장비 필름 재고: 늘 묶어서 본다 (기본은 브랜드)
    static let filmStock: [GearGroup] = [.brand, .iso, .process, .format]
}

/// 같은 묶음 이름끼리 모으고, sort 값 순서로 묶음을 늘어놓는다 (묶음 안 순서는 그대로)
func groupSections<T>(_ items: [T], _ key: (T) -> (sort: String, title: String)) -> [(title: String?, items: [T])] {
    var order: [String] = []
    var bucket: [String: (sort: String, items: [T])] = [:]
    for item in items {
        let k = key(item)
        if bucket[k.title] == nil { order.append(k.title); bucket[k.title] = (k.sort, []) }
        bucket[k.title]!.items.append(item)
    }
    return order.sorted { (bucket[$0]!.sort, $0) < (bucket[$1]!.sort, $1) }.map { (Optional($0), bucket[$0]!.items) }
}

extension FilmStock {
    /// 흑백·컬러 묶음 (컬러 네거티브 → 흑백 → 슬라이드 → 영화용)
    var processGroup: (sort: String, title: String) {
        switch process {
        case .c41: ("0", "컬러 네거티브")
        case .bw: ("1", "흑백")
        case .e6: ("2", "슬라이드")
        case .ecn2: ("3", "영화용")
        case .instant: ("4", "인스턴트")
        }
    }

    func groupKey(_ g: GearGroup) -> (sort: String, title: String) {
        switch g {
        case .brand: (brand.lowercased(), brand.isEmpty ? "기타" : brand)
        case .iso: (String(format: "%06d", iso), "ISO \(iso)")
        case .process: processGroup
        case .format: formats.first?.family ?? ("", "")
        default: ("", "")
        }
    }
}

extension FilmLotItem {
    func groupKey(_ g: GearGroup) -> (sort: String, title: String) {
        let stock = FilmStockCatalog.stock(id: filmStockID)
        switch g {
        case .format: return format.family
        case .brand, .iso, .process:
            guard let stock else { return ("~", "기타") }
            return stock.groupKey(g)
        default: return ("", "")
        }
    }
}

extension CameraItem {
    func groupKey(_ g: GearGroup) -> (sort: String, title: String) {
        switch g {
        case .brand: return (brand.lowercased(), brand.isEmpty ? "기타" : brand)
        case .type:
            let order: [CameraBodyStyle] = [.slr, .rangefinder, .compact, .mediumFormat]
            return (String(order.firstIndex(of: bodyStyle) ?? 9), bodyStyle.displayName)
        default: return ("", "")
        }
    }
}

/// 검색 칸 옆 '묶어 보기' 버튼 (고른 기준이 있으면 주황으로 채움)
struct GearGroupMenu: View {
    @Binding var value: String
    let options: [GearGroup]

    var body: some View {
        let on = value != GearGroup.none.rawValue
        Menu {
            Picker("묶어 보기", selection: $value) {
                ForEach(options) { Text($0.title).tag($0.rawValue) }
            }
        } label: {
            Label("묶어 보기", systemImage: "rectangle.3.group")
                .labelStyle(.iconOnly)
                .padding(9)
                .foregroundStyle(on ? .white : Theme.safelight)
                .background(on ? Theme.safelight : Theme.card, in: RoundedRectangle(cornerRadius: 12))
        }
        .accessibilityValue(GearGroup(rawValue: value)?.title ?? "")
    }
}

/// 내 장비 필름 재고 정렬: 알파벳 · 재고량 · 자주 사용 (웹·갤럭시와 같음)
enum FilmLotSort: String, CaseIterable, Identifiable {
    case name, count, usage
    var id: String { rawValue }
    var title: String {
        switch self {
        case .name: "알파벳"
        case .count: "재고량"
        case .usage: "자주 사용"
        }
    }
}

/// 내 장비 필름 탭의 '정렬·묶기' 버튼 (정렬 기준 · 오름/내림 · 묶기 기준)
struct FilmLotMenu: View {
    @Binding var group: String
    @Binding var sort: String
    @Binding var descending: Bool

    var body: some View {
        Menu {
            Section("정렬") {
                Picker("정렬", selection: $sort) {
                    ForEach(FilmLotSort.allCases) { Text($0.title).tag($0.rawValue) }
                }
                Picker("순서", selection: $descending) {
                    Text("오름차순").tag(false)
                    Text("내림차순").tag(true)
                }
            }
            Section("묶기") {
                Picker("묶기", selection: $group) {
                    ForEach(GearGroup.filmStock) { Text($0.title).tag($0.rawValue) }
                }
            }
        } label: {
            Label("정렬·묶기", systemImage: "arrow.up.arrow.down")
                .labelStyle(.iconOnly)
                .padding(9)
                .foregroundStyle(.white)
                .background(Theme.safelight, in: RoundedRectangle(cornerRadius: 12))
        }
    }
}

