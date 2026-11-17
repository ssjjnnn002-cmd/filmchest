import SwiftUI
import SwiftData
import FilmScanCore

/// 필름 장착하기: 카메라 → 필름(통 그림으로 고르기) → 렌즈/ISO
struct LoadFilmView: View {
    var initialCamera: CameraItem?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Environment(Router.self) private var router
    @Query(sort: \CameraItem.sortOrder) private var cameras: [CameraItem]
    @Query(sort: \LensItem.createdAt) private var lenses: [LensItem]
    @Query(sort: \RollItem.loadedAt, order: .reverse) private var rolls: [RollItem]
    @Query private var lots: [FilmLotItem]
    @State private var loading = false
    @State private var confirmExpired = false

    @State private var cameraID: UUID?
    @State private var filmID: String?
    @State private var lensID: UUID?
    @State private var newLensBrand = ""
    @State private var newLensModel = ""
    @State private var addingLens = false
    @State private var pushPull = 0          // 증감 스톱
    @State private var startToday = true
    @State private var startDate = Date()

    private var available: [CameraItem] { cameras.filter { $0.deletedAt == nil } }
    private var camera: CameraItem? { available.first { $0.id == cameraID } }

    /// 최근에 쓴 카메라 순서 (쓴 적 없으면 장비 순서), 지금 필름이 들어 있는 카메라는 맨 오른쪽 (웹·갤럭시와 같음)
    private var pickOrder: [CameraItem] {
        func recent(_ c: CameraItem) -> Int { rolls.firstIndex { $0.camera?.id == c.id && $0.deletedAt == nil } ?? .max }
        let sorted = available.enumerated().sorted { a, b in
            (recent(a.element), a.offset) < (recent(b.element), b.offset)
        }.map(\.element)
        return sorted.filter { $0.loadedRoll == nil } + sorted.filter { $0.loadedRoll != nil }
    }
    private var film: FilmStock? { filmID.flatMap(FilmStockCatalog.stock) }

    private var mountLenses: [LensItem] {
        guard let mount = camera?.mount?.nilIfBlank else { return [] }
        return lenses.filter { $0.mount.caseInsensitiveCompare(mount) == .orderedSame }
    }

    private var shotISO: Int? {
        guard let film, pushPull != 0 else { return nil }
        return Int((Double(film.iso) * pow(2, Double(pushPull))).rounded())
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("카메라") {
                    if available.isEmpty {
                        Text("먼저 내 장비에서 카메라를 추가해 주세요.").foregroundStyle(.secondary)
                    }
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(pickOrder) { c in
                                cameraChip(c)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    if let loaded = camera?.loadedRoll {
                        Label("지금 장착된 \(loaded.filmName)은(는) 촬영을 끝낸 롤로 옮겨져요.", systemImage: "info.circle")
                            .font(.footnote).foregroundStyle(.orange)
                    }
                }

                if let camera, camera.isInterchangeable {
                    Section {
                        Picker("렌즈", selection: $lensID) {
                            Text("렌즈 고르기").tag(UUID?.none)
                            ForEach(mountLenses) { Text($0.displayName).tag(Optional($0.id)) }
                        }
                        if addingLens {
                            TextField("제조사", text: $newLensBrand)
                            TextField("렌즈", text: $newLensModel)
                            LensSuggestions(mount: camera.mount, text: $newLensModel)
                        } else {
                            Button("새 렌즈 추가", systemImage: "plus") { addingLens = true }
                        }
                    } header: {
                        Text("렌즈 · \(camera.mount ?? "")")
                    } footer: {
                        if !lensReady {
                            Text("끼운 렌즈를 골라 주세요. 중간에 바꿔 끼우면 롤 화면에서 기록할 수 있어요.").foregroundStyle(.orange)
                        }
                    }
                }

                FilmPickSection(filmID: $filmID, format: camera?.format ?? .f135) {
                    if let film, stockCount(film.id) > 0 { Text("재고 \(stockCount(film.id))롤 · 장착하면 1롤 빼요") }
                }

                // 필름을 고르기 전에도 보인다 (감도는 '선택 안 됨')
                do {
                    Section {
                        Stepper(value: $pushPull, in: -2...3) {
                            LabeledContent("감도", value: film.map { film in pushPull == 0 ? "ISO \(film.iso)"
                                           : "ISO \(shotISO ?? film.iso) (\(pushPull > 0 ? "+" : "")\(pushPull) 스톱)" } ?? "선택 안 됨")
                        }
                        .disabled(film == nil)
                        Toggle("오늘을 촬영일로 설정하기", isOn: $startToday)
                        if startToday {
                            DatePicker("날짜", selection: $startDate, in: ...Date(), displayedComponents: .date)
                        }
                    } footer: {
                        VStack(alignment: .leading, spacing: 4) {
                            if Subscriptions.subscriptionEnabled, !Subscriptions.shared.isSubscribed {
                                Text("무료 롤 \(RollQuota.used(in: context))/\(RollQuota.freeLimit)")
                            }
                            if startToday && Calendar.current.isDateInToday(startDate) { Text("지금 시각과 현재 위치를 첫 촬영일로 기록해요.") }
                        }
                    }
                }

            }
            .formStyle(.grouped)
            .filmKeyboard()
            .rollPaywall()
            .navigationTitle("필름 장착하기")
            .confirmationDialog("유통기한이 지난 필름이에요.", isPresented: $confirmExpired, titleVisibility: .visible) {
                Button("그래도 장착") { Task { await load() } }
                Button("취소", role: .cancel) {}
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("장착") {
                        if let film, lots.contains(where: { $0.filmStockID == film.id && $0.expired }) {
                            confirmExpired = true
                        } else {
                            Task { await load() }
                        }
                    }.disabled(camera == nil || film == nil || !lensReady || loading)
                }
            }
            .task { await Subscriptions.shared.refreshEntitlement() }
            .onAppear {
                cameraID = initialCamera?.id ?? pickOrder.first?.id
                selectLastLens()
            }
            .onChange(of: cameraID) { _, _ in selectLastLens() }
        }
        #if os(macOS)
        .frame(minWidth: 560, minHeight: 680)
        #endif
    }

    /// 렌즈 교환식이면 렌즈를 골라야 장착할 수 있다
    private var lensReady: Bool {
        guard let camera, camera.isInterchangeable else { return true }
        return lensID != nil || (addingLens && newLensModel.nilIfBlank != nil)
    }

    /// 그 카메라에 지난번 끼웠던 렌즈를 미리 고른다
    private func selectLastLens() {
        guard let camera, camera.isInterchangeable else { return }
        let last = rolls.first { $0.camera?.id == camera.id && $0.lastLensID != nil }?.lastLensID
        lensID = mountLenses.contains { $0.id == last } ? last : nil
    }

    private func cameraChip(_ c: CameraItem) -> some View {
        Button { cameraID = c.id } label: {
            VStack(spacing: 4) {
                CameraCoverView(camera: c).frame(width: 84, height: 56)
                Text(c.displayName).font(.caption2).lineLimit(1)
            }
            .frame(width: 104)
            .padding(6)
            .background(RoundedRectangle(cornerRadius: 12).fill(cameraID == c.id ? Theme.safelight.opacity(0.15) : Color.clear))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(cameraID == c.id ? Theme.safelight : .secondary.opacity(0.25),
                                                                      lineWidth: cameraID == c.id ? 2 : 1))
        }
        .buttonStyle(.plain)
    }

    private func stockCount(_ filmID: String) -> Int {
        lots.filter { $0.filmStockID == filmID }.reduce(0) { $0 + max(0, $1.count) }
    }

    private func load() async {
        // '장착'을 빠르게 여러 번 눌러도 롤은 하나만 (구독 확인을 기다리는 동안 다시 눌리는 것 막기)
        guard !loading, let camera, let film else { return }
        loading = true
        defer { loading = false }
        await Subscriptions.shared.refreshEntitlement()
        guard Subscriptions.shared.allowNewRoll(in: context) else { return }
        if let old = camera.loadedRoll {
            old.status = .finished
            old.finishedAt = Date()
        }

        var lens = lenses.first { $0.id == lensID }
        if lens == nil, addingLens, let model = newLensModel.nilIfBlank, let mount = camera.mount {
            let l = LensItem(brand: newLensBrand.nilIfBlank ?? camera.brand, model: model, mount: mount)
            context.insert(l)
            lens = l
        }

        let roll = RollItem(camera: camera, lens: lens, filmStockID: film.id, shotISO: shotISO)
        context.insert(roll)
        // 재고가 있으면 1롤 뺀다 (웹·갤럭시와 같은 규칙: 포맷이 맞는 것, 유통기한이 이른 것 먼저)
        if let lot = lots.filter({ $0.filmStockID == film.id && $0.count > 0 }).sorted(by: { a, b in
            let fa = a.format == camera.format ? 0 : 1, fb = b.format == camera.format ? 0 : 1
            if fa != fb { return fa < fb }
            return (a.expiresAt ?? .distantFuture) < (b.expiresAt ?? .distantFuture)
        }).first {
            lot.count -= 1
        }
        Subscriptions.shared.noteRollCreated(in: context)

        if startToday {
            let today = Calendar.current.isDateInToday(startDate)
            roll.shootingDays = [ShootingDay(startedAt: today ? Date() : startDate, startFrame: 1)]
            if today { router.fillCurrentPlace(for: roll) }
            if !today { roll.loadedAt = startDate }   // 위치는 화면을 닫은 뒤 백그라운드에서 채운다
        }
        router.tab = .shooting
        dismiss()
    }
}
