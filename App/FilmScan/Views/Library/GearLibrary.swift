import SwiftUI
import SwiftData
import PhotosUI
#if os(iOS)
import UIKit
#endif
import FilmScanCore

enum GearTab: String, CaseIterable, Identifiable {
    case camera, lens, filter, film
    var id: String { rawValue }
    var title: String {
        switch self {
        case .camera: "카메라"
        case .lens: "렌즈"
        case .filter: "액세서리"
        case .film: "필름"
        }
    }
}

private let filterNames = ["UV", "CPL", "ND2", "ND4", "ND8", "ND16", "Yellow", "Orange", "Red", "Green", "Soft",
                           "Black Pro-Mist 1/8", "Black Pro-Mist 1/4", "Black Pro-Mist 1/2"]
private let filterDiameters = ["37", "39", "40.5", "43", "46", "49", "52", "55", "58", "62", "67", "72", "77", "82"]

enum PriceText {
    /// 숫자만 쉼표로 묶는다. 글자가 섞인 예전 메모는 그대로 둔다.
    static func grouped(_ raw: String) -> String {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return "" }
        guard trimmed.allSatisfy({ $0.isNumber || $0 == "," }) else { return raw }
        let digits = trimmed.filter(\.isNumber)
        guard !digits.isEmpty else { return "" }
        let body = digits.drop(while: { $0 == "0" })
        let normalized = body.isEmpty ? "0" : String(body)
        var out = ""
        for (index, character) in normalized.reversed().enumerated() {
            if index > 0, index.isMultiple(of: 3) { out.append(",") }
            out.append(character)
        }
        return String(out.reversed())
    }
}

enum SellerDirectory {
    private static let key = "filmscan.knownSellers"
    private static let hiddenKey = "filmscan.hiddenSellers"

    static func all() -> [String] {
        UserDefaults.standard.stringArray(forKey: key) ?? []
    }

    static func remember(_ raw: String) {
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        var list = all().filter { $0.caseInsensitiveCompare(name) != .orderedSame }
        list.insert(name, at: 0)
        UserDefaults.standard.set(Array(list.prefix(40)), forKey: key)
        let hidden = hiddenNames().filter { $0.caseInsensitiveCompare(name) != .orderedSame }
        UserDefaults.standard.set(hidden, forKey: hiddenKey)
    }

    /// 추천 목록에서만 뺀다. 장비에 적힌 구입처는 그대로다.
    static func forget(_ raw: String) {
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        let list = all().filter { $0.caseInsensitiveCompare(name) != .orderedSame }
        UserDefaults.standard.set(list, forKey: key)
        var hidden = hiddenNames().filter { $0.caseInsensitiveCompare(name) != .orderedSame }
        hidden.insert(name, at: 0)
        UserDefaults.standard.set(Array(hidden.prefix(40)), forKey: hiddenKey)
    }

    private static func hiddenNames() -> [String] {
        UserDefaults.standard.stringArray(forKey: hiddenKey) ?? []
    }
}

struct PurchaseFields: View {
    @Binding var hasDate: Bool
    @Binding var date: Date
    @Binding var price: String
    @Binding var seller: String
    @Query(sort: \CameraItem.createdAt) private var cameras: [CameraItem]
    @Query(sort: \LensItem.createdAt) private var lenses: [LensItem]
    @Query(sort: \FilterItem.createdAt) private var filters: [FilterItem]
    @Query(sort: \FilmLotItem.createdAt) private var lots: [FilmLotItem]
    @State private var sellerRevision = 0

    private var suggestions: [String] {
        _ = sellerRevision
        let blocked = Set(UserDefaults.standard.stringArray(forKey: "filmscan.hiddenSellers")?.map { $0.lowercased() } ?? [])
        let used = (cameras.map(\.seller) + lenses.map(\.seller) + filters.map(\.seller) + lots.map(\.seller)).compactMap { $0?.nilIfBlank }
        var seen = Set<String>()
        var list: [String] = []
        for name in SellerDirectory.all() + used {
            let key = name.lowercased()
            guard !blocked.contains(key), seen.insert(key).inserted else { continue }
            list.append(name)
        }
        let query = seller.trimmingCharacters(in: .whitespacesAndNewlines)
        return list.filter { query.isEmpty || ($0.localizedCaseInsensitiveContains(query) && $0.caseInsensitiveCompare(query) != .orderedSame) }
    }

    var body: some View {
        Section("구입") {
            // 처음부터 달력으로 고른다. 고르면 기록되고, 지우기로 비운다.
            HStack {
                DatePicker(selection: Binding(get: { date }, set: { date = $0; hasDate = true }), displayedComponents: .date) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("구입 날짜")
                        if !hasDate { Text("기록 안 함").font(.caption).foregroundStyle(.secondary) }
                    }
                }
                if hasDate {
                    Button { hasDate = false } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                        .buttonStyle(.borderless)
                        .accessibilityLabel("구입 날짜 지우기")
                }
            }
            TextField("구입 금액", text: $price)
                #if os(iOS)
                .keyboardType(.numberPad)
                #endif
                .onChange(of: price) { _, new in
                    let next = PriceText.grouped(new)
                    if next != new { price = next }
                }
            TextField("구입처", text: $seller)
            let hits = Array(suggestions.prefix(8))
            if !hits.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(hits, id: \.self) { name in
                            HStack(spacing: 2) {
                                Button(name) { seller = name }
                                Button {
                                    SellerDirectory.forget(name)
                                    sellerRevision += 1
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.caption2.weight(.bold))
                                }
                                .accessibilityLabel("\(name) 추천 지우기")
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                    }
                }
            }
        }
        .onAppear {
            let next = PriceText.grouped(price)
            if next != price { price = next }
        }
    }
}

struct GearBrowser: View {
    let tab: GearTab
    var layout: LayoutMode = .grid
    var tag: String? = nil
    var search = ""
    var grouped = false
    @Query(sort: \LensItem.createdAt) private var allLenses: [LensItem]
    @Query(sort: \FilterItem.createdAt) private var allFilters: [FilterItem]
    @Query(sort: \FilmLotItem.createdAt, order: .reverse) private var allLots: [FilmLotItem]
    @State private var lensEdit: LensItem?
    @State private var filterEdit: FilterItem?
    @State private var lotEdit: FilmLotItem?

    private func keep(_ tags: [String], _ text: [String]) -> Bool {
        if let tag, !tags.contains(tag) { return false }
        let q = search.trimmingCharacters(in: .whitespaces)
        return q.isEmpty || (text + tags).contains { $0.localizedCaseInsensitiveContains(q) }
    }
    private var lenses: [LensItem] { allLenses.filter { keep($0.tags, [$0.displayName, $0.specLine, $0.mount]) } }
    private var filters: [FilterItem] { allFilters.filter { keep($0.tags, [$0.name, $0.kindName, $0.diameterText]) } }
    private var lots: [FilmLotItem] { allLots.filter { keep([], [$0.title, $0.metaLine]) } }
    private var hasAny: Bool {
        switch tab {
        case .camera: true
        case .lens: !allLenses.isEmpty
        case .filter: !allFilters.isEmpty
        case .film: !allLots.isEmpty
        }
    }

    var body: some View {
        Group {
            switch tab {
            case .camera:
                EmptyView()
            case .lens:
                if allLenses.isEmpty { empty("렌즈가 없어요", "가진 렌즈를 등록해 보세요.") }
                else if lenses.isEmpty { noMatch }
                else {
                    sections(tagSections(lenses, grouped: grouped, tags: \.tags)) { items in
                        if layout == .grid {
                            grid(items) { lens in Button { lensEdit = lens } label: { LensGearCard(lens: lens) }.buttonStyle(.plain) }
                        } else {
                            rows(items) { lens in Button { lensEdit = lens } label: { LensGearRow(lens: lens) }.buttonStyle(.plain) }
                        }
                    }
                }
            case .filter:
                if allFilters.isEmpty { empty("액세서리가 없어요", "필터, 그립, 스트랩처럼 가진 장비를 등록해 보세요.") }
                else if filters.isEmpty { noMatch }
                else {
                    // 묶지 않을 때는 유형별로 나눠 보여 준다
                    let secs = grouped ? tagSections(filters, grouped: true, tags: \.tags)
                        : Dictionary(grouping: filters, by: \.kindName).sorted { kindOrder($0.key) < kindOrder($1.key) }.map { (title: Optional($0.key), items: $0.value) }
                    sections(secs) { items in
                        if layout == .grid {
                            grid(items) { f in Button { filterEdit = f } label: { FilterGearCard(filter: f) }.buttonStyle(.plain) }
                        } else {
                            rows(items) { f in Button { filterEdit = f } label: { FilterGearRow(filter: f) }.buttonStyle(.plain) }
                        }
                    }
                }
            case .film:
                if allLots.isEmpty { empty("필름 재고가 없어요", "가진 롤을 등록해 보세요.") }
                else if lots.isEmpty { noMatch }
                else if layout == .grid {
                    grid(lots) { lot in Button { lotEdit = lot } label: { FilmGearCard(lot: lot) }.buttonStyle(.plain) }
                } else {
                    rows(lots) { lot in Button { lotEdit = lot } label: { FilmGearRow(lot: lot) }.buttonStyle(.plain) }
                }
            }
        }
        .sheet(item: $lensEdit) { LensEditView(lens: $0, mount: $0.mount) }
        .sheet(item: $filterEdit) { FilterEditView(filter: $0) }
        .sheet(item: $lotEdit) { FilmLotEditView(lot: $0) }
    }

    private func kindOrder(_ kind: String) -> Int { AccessoryKinds.all().firstIndex(of: kind) ?? 999 }

    private var noMatch: some View {
        ContentUnavailableView("맞는 장비가 없어요", systemImage: "magnifyingglass").padding(.top, 40)
    }

    private func sections<Item: Identifiable, Content: View>(_ secs: [(title: String?, items: [Item])],
                                                            @ViewBuilder content: @escaping ([Item]) -> Content) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(Array(secs.enumerated()), id: \.offset) { _, sec in
                VStack(alignment: .leading, spacing: 8) {
                    if let title = sec.title {
                        Text("\(title) · \(sec.items.count)")
                            .font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                            .padding(.horizontal, 4)
                    }
                    content(sec.items)
                }
            }
        }
    }

    private func grid<Item: Identifiable, Cell: View>(_ items: [Item], @ViewBuilder cell: @escaping (Item) -> Cell) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 160, maximum: 260), spacing: 12, alignment: .top)], spacing: 12) {
            ForEach(items) { item in
                cell(item).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
        }
    }

    private func rows<Item: Identifiable, Row: View>(_ items: [Item], @ViewBuilder row: @escaping (Item) -> Row) -> some View {
        LazyVStack(spacing: 0) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                row(item)
                if index < items.count - 1 { Divider().padding(.leading, 96) }
            }
        }
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
    }

    private func empty(_ title: String, _ message: String) -> some View {
        ContentUnavailableView {
            Label(title, systemImage: "shippingbox")
        } description: {
            Text(message)
        }
        .padding(.top, 40)
    }
}

private struct GearCardChrome: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(.black.opacity(0.06)))
    }
}

private struct LensGearCard: View {
    let lens: LensItem
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            GearPhotoThumb(data: lens.photo, symbol: "camera.aperture").frame(height: 110)
            Text(lens.model.isEmpty ? "렌즈" : lens.model).font(.headline).lineLimit(2)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .topLeading)
            Text(lens.brand.nilIfBlank ?? " ")
                .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                .opacity(lens.brand.nilIfBlank == nil ? 0 : 1)
            Text(lens.specLine.isEmpty ? " " : lens.specLine)
                .font(.caption2).foregroundStyle(.secondary).lineLimit(2, reservesSpace: true)
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .opacity(lens.specLine.isEmpty ? 0 : 1)
            TagLine(tags: lens.tags)
        }
        .modifier(GearCardChrome())
    }
}

private struct LensGearRow: View {
    let lens: LensItem
    var body: some View {
        HStack(spacing: 14) {
            GearPhotoThumb(data: lens.photo, symbol: "camera.aperture").frame(width: 68, height: 52)
            VStack(alignment: .leading, spacing: 3) {
                Text(lens.displayName.trimmingCharacters(in: .whitespaces).isEmpty ? "렌즈" : lens.displayName)
                    .font(.subheadline.weight(.semibold)).lineLimit(1)
                Text(lens.specLine.nilIfBlank ?? lens.mount.nilIfBlank ?? " ").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                TagLine(tags: lens.tags)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

private struct FilterGearCard: View {
    let filter: FilterItem
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            GearPhotoThumb(data: filter.photo, symbol: filter.isFilter ? "camera.filters" : "shippingbox").frame(height: 110)
            Text(filter.name.isEmpty ? filter.kindName : filter.name).font(.headline).lineLimit(2, reservesSpace: true)
                .frame(maxWidth: .infinity, alignment: .topLeading)
            Text(filter.subLine).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            TagLine(tags: filter.tags)
        }
        .modifier(GearCardChrome())
    }
}

private struct FilterGearRow: View {
    let filter: FilterItem
    var body: some View {
        HStack(spacing: 14) {
            GearPhotoThumb(data: filter.photo, symbol: filter.isFilter ? "camera.filters" : "shippingbox").frame(width: 68, height: 52)
            VStack(alignment: .leading, spacing: 3) {
                Text(filter.name.isEmpty ? filter.kindName : filter.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                Text(filter.subLine).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                TagLine(tags: filter.tags)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

private struct FilmGearCard: View {
    let lot: FilmLotItem
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            FilmCanisterView(stock: FilmStockCatalog.stock(id: lot.filmStockID), format: lot.format)
                .frame(height: 110)
                .frame(maxWidth: .infinity)
            Text(lot.title).font(.headline).lineLimit(2)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .topLeading)
            Text(lot.metaLine).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                .frame(maxWidth: .infinity, minHeight: 32, alignment: .topLeading)
            lot.lotBadge.frame(minHeight: 16, alignment: .leading)
        }
        .modifier(GearCardChrome())
    }
}

private struct FilmGearRow: View {
    let lot: FilmLotItem
    var body: some View {
        HStack(spacing: 14) {
            FilmCanisterView(stock: FilmStockCatalog.stock(id: lot.filmStockID), format: lot.format)
                .frame(width: 52, height: 52)
            VStack(alignment: .leading, spacing: 3) {
                Text(lot.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                Text(lot.metaLine).font(.caption).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 0)
            lot.lotBadge
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

private struct GearPhotoThumb: View {
    let data: Data?
    var symbol: String
    var body: some View {
        Group {
            if data != nil {
                CameraImageView(data: data)
            } else {
                Image(systemName: symbol)
                    .font(.largeTitle)
                    .foregroundStyle(.tertiary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}

private extension FilterItem {
    var subLine: String { [kindName, diameterText.nilIfBlank, price?.nilIfBlank.map { PriceSum.text(PriceSum.value($0)) }].compactMap { $0 }.joined(separator: " · ") }
}

private extension FilmLotItem {
    var metaLine: String { "\(format.displayName) · \(storage.displayName) · \(count)롤" }
    @ViewBuilder var lotBadge: some View {
        if expired {
            Text("기한 지남").font(.caption.weight(.semibold)).foregroundStyle(.red)
        } else if low {
            Text("부족").font(.caption.weight(.semibold)).foregroundStyle(.orange)
        } else {
            Text(" ").font(.caption)
        }
    }
}

struct GearPhotoEditor: View {
    @Binding var photo: Data?
    var symbol: String = "photo"
    @State private var pickerItem: PhotosPickerItem?
    @State private var showCamera = false
    @State private var lifting = false
    @State private var liftFailed = false

    var body: some View {
        Section {
            ZStack {
                Group {
                    if let photo {
                        CameraImageView(data: photo)
                    } else {
                        Image(systemName: symbol)
                            .font(.system(size: 42, weight: .light))
                            .foregroundStyle(.tertiary)
                    }
                }
                .frame(height: 160)
                .frame(maxWidth: .infinity)
                if lifting {
                    ProgressView("배경 지우는 중…")
                        .padding()
                        .background(.regularMaterial, in: .rect(cornerRadius: 10))
                }
            }
            .listRowSeparator(.hidden)
            #if os(iOS)
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                Button("사진 찍기", systemImage: "camera") { showCamera = true }
            }
            #endif
            PhotosPicker(selection: $pickerItem, matching: .images) {
                Label("앨범에서 사진 고르기", systemImage: "photo")
            }
            if photo != nil {
                Button("사진 지우기", systemImage: "trash", role: .destructive) {
                    photo = nil
                    liftFailed = false
                }
            }
        } header: {
            Text("사진")
        } footer: {
            if liftFailed {
                Text("배경을 지우지 못해 원본을 그대로 썼어요.")
            }
        }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task { await usePhoto(try? await item.loadTransferable(type: Data.self)) }
        }
        #if os(iOS)
        .fullScreenCover(isPresented: $showCamera) {
            SystemCameraPicker { data in
                showCamera = false
                if let data { Task { await usePhoto(data) } }
            }
            .ignoresSafeArea()
        }
        #endif
    }

    private func usePhoto(_ data: Data?) async {
        guard let data else { return }
        lifting = true
        liftFailed = false
        if let ready = await SubjectLifter.alreadyTransparent(data) {
            photo = ready
        } else if let lifted = await SubjectLifter.lift(data) {
            photo = lifted
        } else {
            photo = data
            liftFailed = true
        }
        lifting = false
    }
}

/// 액세서리 추가·수정 (필터, 그립, 스트랩 … 유형은 사용자가 더할 수 있다)
struct FilterEditView: View {
    let filter: FilterItem?
    var presetKind: String? = nil
    var onSaved: ((FilterItem) -> Void)? = nil
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var kind = AccessoryKinds.filter
    @State private var name = ""
    @State private var diameter = ""
    @State private var photo: Data?
    @State private var hasDate = false
    @State private var date = Date()
    @State private var price = ""
    @State private var seller = ""
    @State private var tags: [String] = []
    @State private var confirm = false
    @State private var addingKind = false
    @State private var newKind = ""
    @State private var kinds = AccessoryKinds.all()

    private var isFilter: Bool { kind == AccessoryKinds.filter }

    var body: some View {
        NavigationStack {
            Form {
                GearPhotoEditor(photo: $photo, symbol: isFilter ? "camera.filters" : "shippingbox")
                Section("액세서리") {
                    Picker("유형", selection: Binding(get: { kind }, set: { v in
                        if v == "__add" { addingKind = true } else { kind = v }
                    })) {
                        ForEach(kinds, id: \.self) { Text($0).tag($0) }
                        Text("유형 추가…").tag("__add")
                    }
                    TextField(isFilter ? "종류 (예: UV, ND8)" : "이름", text: $name)
                    if isFilter {
                        let hits = filterNames.filter { name.isEmpty || $0.localizedCaseInsensitiveContains(name) }.filter { $0 != name }.prefix(8)
                        if !hits.isEmpty {
                            chipRow(Array(hits)) { name = $0 }
                        }
                        TextField("직경 (mm)", text: $diameter)
                            #if os(iOS)
                            .keyboardType(.decimalPad)
                            #endif
                        chipRow(filterDiameters.filter { $0 != diameter }) { diameter = $0 }
                    }
                }
                TagField(tags: $tags)
                PurchaseFields(hasDate: $hasDate, date: $date, price: $price, seller: $seller)
                if filter != nil {
                    Section { Button("액세서리 삭제", role: .destructive) { confirm = true } }
                }
            }
            .navigationTitle(filter == nil ? "액세서리 추가" : "액세서리 수정")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save() }.disabled(name.nilIfBlank == nil)
                }
            }
            .alert("유형 추가", isPresented: $addingKind) {
                TextField("예: 핫슈 수평계", text: $newKind)
                Button("추가") {
                    if let k = newKind.nilIfBlank {
                        AccessoryKinds.add(k)
                        kinds = AccessoryKinds.all()
                        kind = k
                    }
                    newKind = ""
                }
                Button("취소", role: .cancel) { newKind = "" }
            }
            .onAppear {
                if let presetKind { kind = presetKind }
                guard let filter else { return }
                kind = filter.kindName
                if !kinds.contains(kind) { AccessoryKinds.add(kind); kinds = AccessoryKinds.all() }
                name = filter.name
                diameter = filter.diameter
                photo = filter.photo
                hasDate = filter.purchasedAt != nil
                date = filter.purchasedAt ?? Date()
                price = filter.price ?? ""
                seller = filter.seller ?? ""
                tags = filter.tags
            }
            .confirmationDialog("이 액세서리를 삭제할까요?", isPresented: $confirm, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    if let filter { context.delete(filter) }
                    dismiss()
                }
            }
        }
    }

    private func chipRow(_ items: [String], pick: @escaping (String) -> Void) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(items, id: \.self) { item in
                    Button(item) { pick(item) }.buttonStyle(.bordered).controlSize(.small)
                }
            }
        }
    }

    private func save() {
        let target = filter ?? {
            let item = FilterItem(name: "")
            context.insert(item)
            return item
        }()
        target.kind = kind
        target.name = name.trimmingCharacters(in: .whitespaces)
        target.diameter = isFilter ? diameter.filter { $0.isNumber || $0 == "." } : ""
        target.photo = photo
        target.purchasedAt = hasDate ? date : nil
        target.price = PriceText.grouped(price).nilIfBlank
        target.seller = seller.nilIfBlank
        target.tags = tags
        if let place = seller.nilIfBlank { SellerDirectory.remember(place) }
        onSaved?(target)
        dismiss()
    }
}

struct FilmLotEditView: View {
    let lot: FilmLotItem?
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var filmID = ""
    @State private var format: FilmFormat = .f135
    @State private var count = 1
    @State private var lowAt = 1
    @State private var storage: FilmStorage = .fridge
    @State private var hasExpiry = false
    @State private var expiry = Date()
    @State private var hasDate = false
    @State private var date = Date()
    @State private var price = ""
    @State private var seller = ""
    @State private var confirm = false

    var body: some View {
        NavigationStack {
            Form {
                FilmLookPicker(filmID: $filmID, format: format)
                Section("보관") {
                    Picker("포맷", selection: $format) {
                        ForEach(FilmFormat.allCases, id: \.self) { Text($0.displayName).tag($0) }
                    }
                    Stepper("수량 \(count)롤", value: $count, in: 0...99)
                    Stepper("부족 알림 \(lowAt)롤 이하", value: $lowAt, in: 0...20)
                    Picker("보관", selection: $storage) {
                        ForEach(FilmStorage.allCases) { Text($0.displayName).tag($0) }
                    }
                    Toggle("유통기한", isOn: $hasExpiry)
                    if hasExpiry {
                        DatePicker("기한", selection: $expiry, displayedComponents: .date)
                    }
                }
                PurchaseFields(hasDate: $hasDate, date: $date, price: $price, seller: $seller)
                if lot != nil {
                    Section { Button("재고 삭제", role: .destructive) { confirm = true } }
                }
            }
            .navigationTitle(lot == nil ? "필름 추가" : "필름 수정")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save() }.disabled(filmID.isEmpty)
                }
            }
            .onAppear {
                guard let lot else { return }
                filmID = lot.filmStockID
                if filmID.isEmpty {
                    filmID = FilmStockCatalog.allIncludingCustom.first { $0.displayName == lot.title }?.id ?? ""
                }
                format = lot.format
                count = lot.count
                lowAt = lot.lowAt
                storage = lot.storage
                hasExpiry = lot.expiresAt != nil
                expiry = lot.expiresAt ?? Date()
                hasDate = lot.purchasedAt != nil
                date = lot.purchasedAt ?? Date()
                price = lot.price ?? ""
                seller = lot.seller ?? ""
            }
            .confirmationDialog("이 재고를 삭제할까요?", isPresented: $confirm, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    if let lot { context.delete(lot) }
                    dismiss()
                }
            }
        }
    }

    private func save() {
        let target = lot ?? {
            let item = FilmLotItem(filmStockID: filmID, format: format)
            context.insert(item)
            return item
        }()
        target.filmStockID = filmID
        target.customName = ""
        target.format = format
        target.count = count
        target.lowAt = lowAt
        target.storage = storage
        target.expiresAt = hasExpiry ? expiry : nil
        target.purchasedAt = hasDate ? date : nil
        target.price = PriceText.grouped(price).nilIfBlank
        target.seller = seller.nilIfBlank
        if let place = seller.nilIfBlank { SellerDirectory.remember(place) }
        dismiss()
    }
}

private struct FilmLookPicker: View {
    @Binding var filmID: String
    var format: FilmFormat
    @Query(sort: \CustomFilmItem.createdAt, order: .reverse) private var customFilms: [CustomFilmItem]
    @Query(sort: \RollItem.loadedAt, order: .reverse) private var rolls: [RollItem]
    @State private var search = ""
    @State private var showAll = false
    @State private var customEdit: CustomFilmTarget?

    private enum CustomFilmTarget: Identifiable {
        case new, edit(CustomFilmItem)
        var id: String { if case .edit(let item) = self { item.id } else { "new" } }
    }

    private static let popular = ["kodak-portra-400", "kodak-gold-200", "ilford-hp5-plus", "kodak-ultramax-400",
                                  "fuji-400", "kodak-trix-400", "cinestill-800t", "kodak-ektar-100"]

    private var stocks: [FilmStock] {
        let recent = rolls.map(\.filmStockID)
        _ = customFilms.count
        let list = FilmStockCatalog.allIncludingCustom
            .filter { format == .halfFrame ? $0.formats.contains(.f135) : $0.formats.contains { $0.is120 == format.is120 } }
            .filter { search.isEmpty || $0.displayName.localizedCaseInsensitiveContains(search) }
        func rank(_ stock: FilmStock) -> (Int, Int) {
            (recent.firstIndex(of: stock.id) ?? .max, Self.popular.firstIndex(of: stock.id) ?? .max)
        }
        return list.sorted { rank($0) < rank($1) }
    }

    private var visibleStocks: [FilmStock] {
        if showAll { return stocks }
        var top = Array(stocks.prefix(6))
        if let selected = FilmStockCatalog.stock(id: filmID), !top.contains(selected), stocks.contains(selected) {
            if top.isEmpty { top = [selected] } else { top[top.count - 1] = selected }
        }
        return top
    }

    var body: some View {
        Section {
            if showAll {
                TextField("필름 검색", text: $search)
            }
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 92), spacing: 6)], spacing: 10) {
                ForEach(visibleStocks) { stock in
                    Button { filmID = stock.id } label: {
                        VStack(spacing: 2) {
                            FilmCanisterView(stock: stock, format: format).frame(height: 84)
                            Text(stock.displayName).font(.caption2).lineLimit(2).multilineTextAlignment(.center)
                                .frame(height: 28, alignment: .top)
                        }
                        .padding(4)
                        .background(RoundedRectangle(cornerRadius: 10).fill(filmID == stock.id ? Theme.safelight.opacity(0.15) : .clear))
                        .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(filmID == stock.id ? Theme.safelight : .clear, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                }
                Button { customEdit = .new } label: {
                    VStack(spacing: 2) {
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Theme.safelight.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                            .overlay(Image(systemName: "plus").font(.title2.weight(.light)).foregroundStyle(Theme.safelight))
                            .frame(width: 76, height: 76)
                            .frame(height: 84)
                        Text("직접 추가").font(.caption2.weight(.semibold)).foregroundStyle(Theme.safelight)
                            .frame(height: 28, alignment: .top)
                    }
                    .padding(4)
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 4)
            if let film = FilmStockCatalog.stock(id: filmID), film.isCustom, let item = customFilms.first(where: { $0.id == film.id }) {
                Button("\(film.displayName) 수정", systemImage: "pencil") { customEdit = .edit(item) }
                    .frame(maxWidth: .infinity)
            }
            Button {
                withAnimation { showAll.toggle() }
                if !showAll { search = "" }
            } label: {
                Label(showAll ? "접기" : "더보기 (\(stocks.count)종)", systemImage: showAll ? "chevron.up" : "chevron.down")
                    .frame(maxWidth: .infinity)
            }
        } header: {
            Text(showAll ? "필름" : "필름 · 최근 사용")
        }
        .sheet(item: $customEdit) { target in
            switch target {
            case .new:
                CustomFilmEditView(item: nil) { if let id = $0 { filmID = id } }
            case .edit(let item):
                CustomFilmEditView(item: item) { filmID = $0 ?? "" }
            }
        }
    }
}
