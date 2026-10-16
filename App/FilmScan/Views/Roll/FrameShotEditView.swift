import SwiftUI
import FilmScanCore

/// 한 컷의 측광 기록. 없으면 새로 넣고, 있으면 그 칸을 고친다.
struct FrameShotEditView: View {
    let roll: RollItem
    /// 필름 칸 번호. 사진 번호는 여기에 meterOffset을 더한 값.
    let pos: Int
    @Environment(\.dismiss) private var dismiss

    @State private var aperture: Double?
    @State private var shutter: Double?
    @State private var comp: Double = 0
    @State private var flash = false
    @State private var focal = ""
    @State private var filters = ""
    @State private var memo = ""
    @State private var iso = ""
    @State private var existed = false

    private let apertures: [Double] = [1, 1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16, 22]
    private let shutters: [Double] = [1.0 / 8000, 1.0 / 4000, 1.0 / 2000, 1.0 / 1000, 1.0 / 500, 1.0 / 250, 1.0 / 125, 1.0 / 60, 1.0 / 30, 1.0 / 15, 1.0 / 8, 1.0 / 4, 1.0 / 2, 1, 2, 4, 8, 15, 30]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    optionalPicker("조리개", value: $aperture, choices: apertures.map { ($0, FrameCaptionFormat.aperture($0)) })
                    optionalPicker("셔터", value: $shutter, choices: shutters.map { ($0, FrameCaptionFormat.shutter($0)) })
                    Stepper(value: $comp, in: -3...3, step: 1.0 / 3.0) {
                        Text("보정 \(MeterShot.formatComp(comp))")
                    }
                    Toggle("플래시", isOn: $flash)
                } header: {
                    Text("노출")
                } footer: {
                    Text("비워 두면 그 줄은 프레임에 안 써요.")
                }
                Section("이 롤 ISO") {
                    TextField("ISO", text: $iso)
                        #if os(iOS)
                        .keyboardType(.numberPad)
                        #endif
                }
                Section("추가") {
                    TextField("초점 거리 mm", text: $focal)
                        #if os(iOS)
                        .keyboardType(.numberPad)
                        #endif
                    TextField("필터", text: $filters)
                    TextField("메모", text: $memo)
                }
                Section {
                    Button("저장") { save(); dismiss() }
                    if existed {
                        Button("이 컷 기록 지우기", role: .destructive) { remove(); dismiss() }
                    }
                }
            }
            .navigationTitle("\(MeterShot.frameTitle(pos + roll.meterOffset, prewind: roll.meterPrewind == true)) 촬영 정보")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
            }
            .onAppear(perform: load)
        }
    }

    private func optionalPicker(_ title: String, value: Binding<Double?>, choices: [(Double, String)]) -> some View {
        var options = choices
        if let current = value.wrappedValue, !choices.contains(where: { abs($0.0 - current) < 0.0001 }) {
            options.append((current, String(format: "%g", current)))
        }
        return Picker(title, selection: value) {
            Text("없음").tag(Optional<Double>.none)
            ForEach(options, id: \.0) { item in
                Text(item.1).tag(Optional(item.0))
            }
        }
    }

    private func load() {
        iso = roll.shotISO.map(String.init) ?? ""
        guard let shot = roll.meterShots.first(where: { $0.pos == pos }) else { return }
        existed = true
        aperture = shot.aperture
        shutter = shot.shutter
        comp = shot.comp
        flash = shot.flash
        focal = shot.focal.map(String.init) ?? ""
        filters = shot.filters?.joined(separator: ", ") ?? ""
        memo = shot.memo ?? ""
    }

    private func save() {
        roll.shotISO = Int(iso.trimmingCharacters(in: .whitespaces))
        var shots = roll.meterShots
        let previous = shots.first { $0.pos == pos }
        let order = previous?.order ?? (shots.map(\.order).max() ?? 0) + 1
        let names = filters.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        let shot = MeterShot(
            pos: pos, order: order, mode: previous?.mode ?? "M",
            aperture: aperture, shutter: shutter, comp: (comp * 3).rounded() / 3, flash: flash,
            ev: previous?.ev ?? 0,
            focal: Int(focal.trimmingCharacters(in: .whitespaces)),
            at: previous?.at ?? ISO8601DateFormatter().string(from: Date()), edited: true,
            filters: names.isEmpty ? nil : names, tags: previous?.tags, memo: memo.nilIfBlank
        )
        if let i = shots.firstIndex(where: { $0.pos == pos }) { shots[i] = shot } else { shots.append(shot) }
        roll.meterShots = shots
    }

    private func remove() {
        roll.meterShots = roll.meterShots.filter { $0.pos != pos }
    }
}
