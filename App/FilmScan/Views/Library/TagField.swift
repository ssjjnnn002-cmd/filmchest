import SwiftUI
import SwiftData

/// 내가 쓴 태그 목록 (추천용). 추천에서 지운 것은 다시 쓰기 전까지 안 보인다.
enum TagDirectory {
    private static let key = "filmscan.knownTags"
    private static let hiddenKey = "filmscan.hiddenTags"

    static func all() -> [String] { UserDefaults.standard.stringArray(forKey: key) ?? [] }
    static func hidden() -> Set<String> { Set((UserDefaults.standard.stringArray(forKey: hiddenKey) ?? []).map { $0.lowercased() }) }

    static func remember(_ tags: [String]) {
        var list = all()
        for t in tags.reversed() {
            list.removeAll { $0.caseInsensitiveCompare(t) == .orderedSame }
            list.insert(t, at: 0)
        }
        UserDefaults.standard.set(Array(list.prefix(80)), forKey: key)
        let lower = Set(tags.map { $0.lowercased() })
        UserDefaults.standard.set((UserDefaults.standard.stringArray(forKey: hiddenKey) ?? []).filter { !lower.contains($0.lowercased()) }, forKey: hiddenKey)
    }

    /// 추천에서만 뺀다. 이미 붙인 태그는 그대로다.
    static func forget(_ tag: String) {
        UserDefaults.standard.set(all().filter { $0.caseInsensitiveCompare(tag) != .orderedSame }, forKey: key)
        var hiddenList = UserDefaults.standard.stringArray(forKey: hiddenKey) ?? []
        hiddenList.insert(tag, at: 0)
        UserDefaults.standard.set(hiddenList, forKey: hiddenKey)
    }

    static func clean(_ raw: String) -> String {
        raw.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    }
}

/// 태그 넣기: 붙인 태그(× 로 빼기) + 입력 + 예전에 쓴 태그 추천(× 로 추천 지우기)
struct TagField: View {
    @Binding var tags: [String]
    @Query private var cameras: [CameraItem]
    @Query private var lenses: [LensItem]
    @Query private var filters: [FilterItem]
    @Query private var rolls: [RollItem]
    @State private var text = ""
    @State private var revision = 0

    private var suggestions: [String] {
        _ = revision
        let hidden = TagDirectory.hidden()
        let used = cameras.flatMap(\.tags) + lenses.flatMap(\.tags) + filters.flatMap(\.tags) + rolls.flatMap(\.tags)
        var seen = Set(tags.map { $0.lowercased() })
        var out: [String] = []
        for t in TagDirectory.all() + used {
            let k = t.lowercased()
            guard !hidden.contains(k), seen.insert(k).inserted else { continue }
            out.append(t)
        }
        let q = TagDirectory.clean(text)
        return out.filter { q.isEmpty || $0.localizedCaseInsensitiveContains(q) }
    }

    var body: some View {
        Section {
            if !tags.isEmpty {
                FlowTags(tags: tags, removable: true) { t in tags.removeAll { $0 == t } }
            }
            TextField("태그 추가", text: $text)
                .autocorrectionDisabled()
                #if os(iOS)
                .textInputAutocapitalization(.never)
                #endif
                .onSubmit(add)
            let hits = Array(suggestions.prefix(12))
            if !hits.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(hits, id: \.self) { t in
                            HStack(spacing: 2) {
                                Button("#\(t)") { tags.append(t); text = "" }
                                Button {
                                    TagDirectory.forget(t)
                                    revision += 1
                                } label: { Image(systemName: "xmark").font(.caption2.weight(.bold)) }
                                .accessibilityLabel("\(t) 추천 지우기")
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                        }
                    }
                }
            }
        } header: {
            Text("태그")
        } footer: {
            Text("검색과 목록 정리에 써요. 입력하고 완료를 누르면 붙어요.")
        }
        .onChange(of: tags) { _, new in TagDirectory.remember(new) }
    }

    private func add() {
        let t = TagDirectory.clean(text)
        guard !t.isEmpty else { return }
        if !tags.contains(where: { $0.caseInsensitiveCompare(t) == .orderedSame }) { tags.append(t) }
        text = ""
    }
}

/// 태그 칩 줄
struct FlowTags: View {
    let tags: [String]
    var removable = false
    var onRemove: (String) -> Void = { _ in }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(tags, id: \.self) { t in
                    HStack(spacing: 4) {
                        Text("#\(t)")
                        if removable {
                            Button { onRemove(t) } label: { Image(systemName: "xmark").font(.caption2.weight(.bold)) }
                                .buttonStyle(.plain)
                                .accessibilityLabel("\(t) 빼기")
                        }
                    }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.safelight)
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Theme.safelight.opacity(0.12), in: Capsule())
                }
            }
        }
    }
}

/// 카메라에 쓰는 액세서리: 액세서리 탭에 등록한 장비에서 고른다
struct AccessoryLinkFields: View {
    @Binding var ids: [UUID]
    var bodyPrice: String
    @Query(sort: \FilterItem.createdAt) private var items: [FilterItem]
    @State private var picking = false

    private var chosen: [FilterItem] { ids.compactMap { id in items.first { $0.id == id } } }
    private var total: Int { PriceSum.value(bodyPrice) + chosen.reduce(0) { $0 + PriceSum.value($1.price) } }

    var body: some View {
        Section {
            ForEach(chosen) { a in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(a.name)
                        Text(a.kindName).font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if let p = a.price?.nilIfBlank { Text(PriceSum.text(PriceSum.value(p))).foregroundStyle(.secondary) }
                }
            }
            .onDelete { offsets in
                let removed = offsets.map { chosen[$0].id }
                ids.removeAll { removed.contains($0) }
            }
            Button("액세서리 고르기", systemImage: "plus") { picking = true }
            if total > 0 {
                LabeledContent("본체 + 액세서리", value: PriceSum.text(total))
            }
        } header: {
            Text("액세서리")
        } footer: {
            Text("내 장비의 액세서리 탭에 등록한 것에서 골라요. 밀어서 뺄 수 있어요.")
        }
        .sheet(isPresented: $picking) { AccessoryPicker(ids: $ids) }
    }
}

/// 등록된 액세서리 고르기 + 없으면 바로 추가하고 돌아와서 고르기
struct AccessoryPicker: View {
    @Binding var ids: [UUID]
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \FilterItem.createdAt) private var items: [FilterItem]
    @State private var adding = false

    private var kinds: [String] {
        let used = Set(items.map(\.kindName))
        return AccessoryKinds.all().filter { used.contains($0) } + used.subtracting(AccessoryKinds.all()).sorted()
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button("새 액세서리 추가", systemImage: "plus.circle.fill") { adding = true }
                } footer: {
                    if items.isEmpty { Text("등록된 액세서리가 없어요. 추가하면 여기서 바로 골라져요.") }
                }
                ForEach(kinds, id: \.self) { kind in
                    Section(kind) {
                        ForEach(items.filter { $0.kindName == kind }) { a in
                            Button {
                                if ids.contains(a.id) { ids.removeAll { $0 == a.id } } else { ids.append(a.id) }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(a.name).foregroundStyle(.primary)
                                        let sub = [a.diameterText.nilIfBlank, a.price?.nilIfBlank.map { PriceSum.text(PriceSum.value($0)) }].compactMap { $0 }
                                        if !sub.isEmpty { Text(sub.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary) }
                                    }
                                    Spacer()
                                    Image(systemName: ids.contains(a.id) ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(ids.contains(a.id) ? Theme.safelight : .secondary)
                                }
                                .contentShape(Rectangle())
                            }
                        }
                    }
                }
            }
            .navigationTitle("액세서리 고르기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } }
            }
            .sheet(isPresented: $adding) {
                FilterEditView(filter: nil) { added in
                    if !ids.contains(added.id) { ids.append(added.id) }
                }
            }
        }
    }
}

/// 예전에 카메라 안에 적어 둔 액세서리를 액세서리 탭 장비로 옮긴다 (한 번만)
enum AccessoryMigration {
    @MainActor
    static func run(_ context: ModelContext) {
        guard let cameras = try? context.fetch(FetchDescriptor<CameraItem>()) else { return }
        for camera in cameras where !camera.accessories.isEmpty {
            for old in camera.accessories where !old.name.trimmingCharacters(in: .whitespaces).isEmpty {
                let item = FilterItem(name: old.name)
                item.kind = AccessoryKinds.all().contains(old.name) ? old.name : "기타"
                item.price = old.price
                item.purchasedAt = old.purchasedAt
                context.insert(item)
                camera.accessoryIDs.append(item.id)
            }
            camera.accessories = []
        }
    }
}

/// 태그별로 묶기. 태그가 여럿이면 여러 묶음에 보이고, 태그 없는 것은 맨 아래. 묶지 않으면 한 묶음(제목 없음).
func tagSections<T>(_ items: [T], grouped: Bool, tags: (T) -> [String]) -> [(title: String?, items: [T])] {
    guard grouped else { return [(nil, items)] }
    let all = Set(items.flatMap(tags)).sorted()
    var out: [(title: String?, items: [T])] = all.map { t in ("#\(t)", items.filter { tags($0).contains(t) }) }
    let none = items.filter { tags($0).isEmpty }
    if !none.isEmpty { out.append(("태그 없음", none)) }
    return out
}
