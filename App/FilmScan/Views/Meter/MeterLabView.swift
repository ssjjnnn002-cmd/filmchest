#if os(iOS)
import SwiftUI
import FilmScanCore

/// 숨은 시험 화면: 설정의 '앱 버전' 줄을 여러 번 누르면 열린다.
/// '촬영 중' 화면을 흉내 내서 네이티브 노출계를 실제 기록에 영향 없이 시험한다 (기록은 이 화면 전용 저장소에)
struct MeterLabView: View {
    @AppStorage("meterLab.preset") private var presetID = "x700"
    @AppStorage("meterLab.film") private var filmID = "kodak-portra-400"
    @State private var open: Open?
    @State private var revision = 0

    enum Open: Identifiable { case meterOnly, record; var id: Int { self == .meterOnly ? 0 : 1 } }

    struct Preset: Identifiable {
        var id: String; var gear: MeterGear
    }

    private let presets: [Preset] = [
        Preset(id: "rc35", gear: MeterGear(cameraName: "Olympus 35 RC", modes: ["S", "M"], fastest: 500, slowest: 1.0 / 15,
                                           lens: MeterLens(id: "zuiko42", name: "E.Zuiko 42mm f/2.8", min: 42, max: 42, open: 2.8, close: 22, fixed: true))),
        Preset(id: "af600", gear: MeterGear(cameraName: "Nikon AF600", modes: ["P"], fastest: 250, slowest: 2,
                                            lens: MeterLens(id: "nikon28", name: "Nikon 28mm f/3.5", min: 28, max: 28, open: 3.5, close: 22, fixed: true))),
        Preset(id: "x700", gear: MeterGear(cameraName: "Minolta X-700", modes: ["P", "A", "M"], fastest: 1000, slowest: 4, programAtMinAperture: true,
                                           lens: MeterLens(id: "md50", name: "MD Rokkor 50mm f/1.7", min: 50, max: 50, open: 1.7, close: 22),
                                           lenses: [
                                               MeterLens(id: "md50", name: "MD Rokkor 50mm f/1.7", min: 50, max: 50, open: 1.7, close: 22),
                                               MeterLens(id: "md28", name: "MD W.Rokkor 28mm f/2.8", min: 28, max: 28, open: 2.8, close: 22),
                                               MeterLens(id: "md3570", name: "MD Zoom 35–70mm f/3.5", min: 35, max: 70, open: 3.5, close: 22),
                                               MeterLens(id: "md135", name: "MD Tele Rokkor 135mm f/3.5", min: 135, max: 135, open: 3.5, close: 22),
                                           ])),
    ]

    private var preset: Preset { presets.first { $0.id == presetID } ?? presets[2] }
    private var film: FilmStock { FilmStockCatalog.stock(id: filmID) ?? FilmStockCatalog.all[0] }
    private var key: String { "meterLab.shots.\(presetID)" }
    private var saved: [MeterShot] {
        _ = revision
        guard let data = UserDefaults.standard.data(forKey: key) else { return [] }
        return (try? JSONDecoder().decode([MeterShot].self, from: data)) ?? []
    }

    var body: some View {
        List {
            Section {
                Text("시험 화면 · 실제 기록에는 영향 없어요").font(.footnote).foregroundStyle(.orange)
            }
            Section("촬영 중") {
                VStack(alignment: .leading, spacing: 4) {
                    Text(preset.gear.cameraName).font(.headline)
                    Text(film.displayName).foregroundStyle(.orange).font(.subheadline.weight(.semibold))
                    Text(saved.isEmpty ? "아직 기록 없음" : "기록 \(saved.count)컷").font(.footnote).foregroundStyle(.secondary)
                }
                HStack {
                    Button("상세 기록") { open = .record }.buttonStyle(.bordered)
                    Spacer()
                    Button("노출계만") { open = .meterOnly }.buttonStyle(.borderedProminent)
                }
            }
            Section("시험용 카메라") {
                Picker("카메라", selection: $presetID) {
                    ForEach(presets) { Text($0.gear.cameraName).tag($0.id) }
                }
                Picker("필름 (앱 필름 목록)", selection: $filmID) {
                    ForEach(FilmStockCatalog.allIncludingCustom) { Text($0.displayName).tag($0.id) }
                }
                Button("이 카메라의 시험 기록 지우기", role: .destructive) {
                    UserDefaults.standard.removeObject(forKey: key); revision += 1
                }
            }
        }
        .navigationTitle("노출계 시험")
        .fullScreenCover(item: $open) { which in
            let gear: MeterGear = {
                var g = preset.gear
                if which == .record { g.film = film } else { g.film = nil; g.lens = .generic; g.lenses = []; g.modes = ["P", "A", "S", "M"]; g.fastest = 4000; g.slowest = 8; g.programAtMinAperture = false }
                return g
            }()
            NativeMeterView(gear: gear, shots: which == .record ? saved : [], session: "lab-\(which.id)",
                            onSave: { shots, _ in
                                guard which == .record else { return }
                                UserDefaults.standard.set(try? JSONEncoder().encode(shots), forKey: key); revision += 1
                            },
                            onClose: { open = nil },
                            onEnd: { UserDefaults.standard.removeObject(forKey: key); revision += 1; open = nil })
        }
    }
}
#endif
