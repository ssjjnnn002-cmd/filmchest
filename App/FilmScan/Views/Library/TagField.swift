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

/// 악세서리 (그립, 소프트 셔터, 스트랩 …) 이름과 가격
struct AccessoryFields: View {
    @Binding var items: [GearAccessory]
    var bodyPrice: String

    private var total: Int { PriceSum.value(bodyPrice) + items.reduce(0) { $0 + PriceSum.value($1.price) } }

    var body: some View {
        Section {
            ForEach($items) { $item in
                HStack {
                    TextField("이름", text: $item.name)
                    TextField("가격", text: Binding(get: { item.price ?? "" }, set: { item.price = PriceText.grouped($0).nilIfBlank }))
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 120)
                        #if os(iOS)
                        .keyboardType(.numberPad)
                        #endif
                }
            }
            .onDelete { items.remove(atOffsets: $0) }
            Menu {
                ForEach(["그립", "소프트 셔터 버튼", "스트랩", "스트랩 고리", "렌즈 후드", "케이스"], id: \.self) { name in
                    Button(name) { items.append(GearAccessory(name: name)) }
                }
                Button("직접 입력") { items.append(GearAccessory()) }
            } label: {
                Label("악세서리 추가", systemImage: "plus")
            }
            if total > 0 {
                LabeledContent("본체 + 악세서리", value: PriceSum.text(total))
            }
        } header: {
            Text("악세서리")
        } footer: {
            if !items.isEmpty { Text("밀어서 지울 수 있어요.") }
        }
    }
}
