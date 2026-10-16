import SwiftUI
import SwiftData
import FilmScanCore

/// 목록에 없는 필름 직접 만들기: 이름, 감도, 필름통 색
struct CustomFilmEditView: View {
    let item: CustomFilmItem?
    /// 저장하면 그 필름 id, 지우면 nil
    var onDone: (String?) -> Void

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var isoText = "400"
    @State private var color = Color(PlatformColor(hex: "#FDB913"))
    @State private var colorHex = "#FDB913"
    @State private var blackAndWhite = false
    @State private var confirmDelete = false

    private static let isoChoices = [50, 100, 125, 160, 200, 250, 400, 500, 800, 1600, 3200]
    private static let palette = ["#F4EFE4", "#FDB913", "#F2A71B", "#E2231A", "#C8102E", "#E85D9C", "#5A2D82",
                                  "#1E4FA0", "#2B6CB0", "#00A15F", "#0C8A4B", "#1B1B1B", "#7A7A7A", "#F5F5F2"]

    private var iso: Int { Int(isoText.filter(\.isNumber)) ?? 0 }
    private var preview: FilmStock {
        FilmStockCatalog.customStock(id: item?.id ?? "custom-preview", name: name.isEmpty ? "내 필름" : name,
                                     iso: max(iso, 1), colorHex: colorHex, blackAndWhite: blackAndWhite)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    FilmCanisterView(stock: preview)
                        .frame(height: 150)
                        .frame(maxWidth: .infinity)
                        .listRowBackground(Color.clear)
                }
                Section {
                    TextField("필름 이름", text: $name)
                    HStack {
                        Text("감도")
                        Spacer()
                        TextField("ISO", text: $isoText)
                            #if os(iOS)
                            .keyboardType(.numberPad)
                            #endif
                            .multilineTextAlignment(.trailing)
                            .frame(width: 100)
                    }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(Self.isoChoices, id: \.self) { v in
                                Button("\(v)") { isoText = "\(v)" }
                                    .buttonStyle(.bordered)
                                    .tint(v == iso ? Theme.safelight : .secondary)
                                    .controlSize(.small)
                            }
                        }
                    }
                    Toggle("흑백 필름", isOn: $blackAndWhite)
                }
                Section("필름통 색") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 34), spacing: 12)], spacing: 12) {
                        ForEach(Self.palette, id: \.self) { hex in
                            Circle().fill(Color(PlatformColor(hex: hex)))
                                .overlay(Circle().strokeBorder(.black.opacity(0.1)))
                                .overlay(Circle().strokeBorder(Theme.safelight, lineWidth: hex == colorHex ? 2.5 : 0).padding(-4))
                                .frame(width: 32, height: 32)
                                .onTapGesture { colorHex = hex; color = Color(PlatformColor(hex: hex)) }
                        }
                        ColorPicker("", selection: $color, supportsOpacity: false)
                            .labelsHidden()
                            .onChange(of: color) { _, c in colorHex = c.hexString }
                    }
                    .padding(.vertical, 4)
                }
                if item != nil {
                    Section {
                        Button("필름 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                    } footer: {
                        Text("이 필름으로 기록한 롤은 그대로 남아요.")
                    }
                }
            }
            .navigationTitle(item == nil ? "필름 직접 추가" : "필름 수정")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save() }.disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || iso <= 0)
                }
            }
            .confirmationDialog("이 필름을 목록에서 지울까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    if let item { context.delete(item) }
                    try? context.save()
                    onDone(nil)
                    dismiss()
                }
            }
            .onAppear {
                guard let item else { return }
                name = item.name
                isoText = "\(item.iso)"
                colorHex = item.colorHex
                color = Color(PlatformColor(hex: item.colorHex))
                blackAndWhite = item.isBlackAndWhite
            }
        }
    }

    private func save() {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        let target: CustomFilmItem
        if let item {
            item.name = trimmed; item.iso = iso; item.colorHex = colorHex; item.isBlackAndWhite = blackAndWhite
            target = item
        } else {
            target = CustomFilmItem(name: trimmed, iso: iso, colorHex: colorHex, isBlackAndWhite: blackAndWhite)
            context.insert(target)
        }
        try? context.save()
        FilmStockCatalog.custom = ((try? context.fetch(FetchDescriptor<CustomFilmItem>(sortBy: [SortDescriptor(\.createdAt, order: .reverse)]))) ?? []).map(\.stock)
        onDone(target.id)
        dismiss()
    }
}
