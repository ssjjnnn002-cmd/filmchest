import SwiftUI
import SwiftData
import FilmScanCore

/// 롤의 렌즈 기록: 처음 끼운 렌즈(1번 컷부터) 또는 중간에 바꿔 낀 렌즈(몇 번 컷부터)
struct LensChangeEditView: View {
    let roll: RollItem
    let change: LensChange?
    let isFirst: Bool

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \LensItem.createdAt) private var lenses: [LensItem]
    @State private var startFrame = 2
    @State private var lensID: UUID?
    @State private var addingLens = false
    @State private var newLensModel = ""
    @State private var confirmDelete = false

    private var mount: String { roll.camera?.mount ?? "" }
    private var mountLenses: [LensItem] { lenses.filter { $0.mount.caseInsensitiveCompare(mount) == .orderedSame } }
    private var ready: Bool { addingLens ? newLensModel.nilIfBlank != nil : lensID != nil }

    var body: some View {
        NavigationStack {
            Form {
                if !isFirst {
                    Section {
                        Stepper(value: $startFrame, in: 2...(roll.format == .halfFrame ? 76 : roll.format.is120 ? 20 : 40)) {
                            LabeledContent("바꾼 컷", value: "\(startFrame)번부터")
                        }
                    }
                }
                Section("렌즈 · \(mount)") {
                    ForEach(mountLenses) { lens in
                        Button { lensID = lens.id; addingLens = false } label: {
                            HStack {
                                Text(lens.displayName).foregroundStyle(.primary)
                                Spacer()
                                if !addingLens && lensID == lens.id { Image(systemName: "checkmark").foregroundStyle(Theme.safelight) }
                            }
                        }
                    }
                    if addingLens {
                        TextField("렌즈 이름", text: $newLensModel)
                        LensSuggestions(mount: mount, text: $newLensModel)
                    } else {
                        Button("새 렌즈", systemImage: "plus") { addingLens = true }
                    }
                }
                if change != nil {
                    Section {
                        Button("이 교체 기록 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                    }
                }
            }
            .navigationTitle(isFirst ? "처음 끼운 렌즈" : change == nil ? "렌즈 바꿔 낌" : "렌즈 교체 수정")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("저장") { save() }.disabled(!ready) }
            }
            .confirmationDialog("이 렌즈 교체 기록을 지울까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    if let change { roll.lensChanges.removeAll { $0.id == change.id } }
                    dismiss()
                }
            }
            .onAppear {
                if isFirst {
                    lensID = roll.lens?.id
                } else if let change {
                    startFrame = change.startFrame
                    lensID = change.lensID
                } else {
                    startFrame = (roll.lensChanges.map(\.startFrame).max() ?? 1) + 1
                }
            }
        }
    }

    private func save() {
        var chosen = lensID.flatMap { id in lenses.first { $0.id == id } }
        if addingLens, let model = newLensModel.nilIfBlank {
            let lens = LensItem(brand: roll.camera?.brand ?? "", model: model, mount: mount)
            context.insert(lens)
            chosen = lens
        }
        guard let chosen else { return }
        if isFirst {
            roll.lens = chosen
        } else {
            let value = LensChange(id: change?.id ?? UUID(), startFrame: max(2, startFrame), lensID: chosen.id)
            roll.lensChanges.removeAll { $0.id == value.id }
            roll.lensChanges.append(value)
            roll.lensChanges.sort { $0.startFrame < $1.startFrame }
        }
        try? context.save()
        dismiss()
    }
}
