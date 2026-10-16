import SwiftUI
import SwiftData

enum LabMemory {
    private static let hiddenKey = "filmscan.hiddenLabs"

    static func remember(_ raw: String) {
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        let hidden = hiddenNames().filter { $0.caseInsensitiveCompare(name) != .orderedSame }
        UserDefaults.standard.set(hidden, forKey: hiddenKey)
    }

    static func forget(_ raw: String) {
        let name = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        var hidden = hiddenNames().filter { $0.caseInsensitiveCompare(name) != .orderedSame }
        hidden.insert(name, at: 0)
        UserDefaults.standard.set(Array(hidden.prefix(40)), forKey: hiddenKey)
    }

    static func isHidden(_ name: String) -> Bool {
        hiddenNames().contains { $0.caseInsensitiveCompare(name) == .orderedSame }
    }

    private static func hiddenNames() -> [String] {
        UserDefaults.standard.stringArray(forKey: hiddenKey) ?? []
    }
}

/// 현상소 이름. 직접 적거나, 예전에 적은 현상소를 고른다.
struct LabField: View {
    @Binding var lab: String
    @Query private var rolls: [RollItem]
    @State private var revision = 0

    private var labs: [String] {
        _ = revision
        return Dictionary(grouping: rolls.filter { $0.deletedAt == nil }.compactMap { $0.labName?.nilIfBlank }.filter { !LabMemory.isHidden($0) }, by: { $0 })
            .sorted { $0.value.count > $1.value.count }
            .map(\.key)
    }

    var body: some View {
        TextField("현상소", text: $lab)
        if !labs.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(labs, id: \.self) { name in
                        HStack(spacing: 2) {
                            Button(name) { lab = name }
                            Button {
                                LabMemory.forget(name)
                                revision += 1
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.caption2.weight(.bold))
                            }
                            .accessibilityLabel("\(name) 추천 지우기")
                        }
                        .buttonStyle(.bordered)
                        .tint(lab == name ? Theme.safelight : .secondary)
                    }
                }
            }
        }
    }
}
