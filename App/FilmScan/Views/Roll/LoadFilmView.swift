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
    @State private var search = ""
    @State private var showAllFilms = false
    @Query(sort: \CustomFilmItem.createdAt, order: .reverse) private var customFilms: [CustomFilmItem]
    /// 직접 만들 필름 편집 (nil이 아니면 시트). 새로 만들 땐 .new
    @State private var customEdit: CustomEditTarget?

    enum CustomEditTarget: Identifiable {
        case new, edit(CustomFilmItem)
        var id: String { if case .edit(let item) = self { return item.id }; return "new" }
    }

    private var available: [CameraItem] { cameras.filter { $0.deletedAt == nil } }
    private var camera: CameraItem? { available.first { $0.id == cameraID } }

    /// 필름이 없는 카메라를 앞에 (처음 고른 카메라가 맨 앞에 보이게)
    private var pickOrder: [CameraItem] {
        if let initialCamera, available.contains(where: { $0.id == initialCamera.id }) {
            return [initialCamera] + available.filter { $0.id != initialCamera.id }
        }
        return available.filter { $0.loadedRoll == nil } + available.filter { $0.loadedRoll != nil }
    }
    private var film: FilmStock? { filmID.flatMap(FilmStockCatalog.stock) }

    private var mountLenses: [LensItem] {
        guard let mount = camera?.mount?.nilIfBlank else { return [] }
        return lenses.filter { $0.mount.caseInsensitiveCompare(mount) == .orderedSame }
    }

    /// 최근에 쓴 필름을 앞으로
    private var stocks: [FilmStock] {
        let format = camera?.format ?? .f135
        let recent = rolls.map(\.filmStockID)
        _ = customFilms.count // 직접 만든 필름이 바뀌면 다시 계산
        let list = FilmStockCatalog.allIncludingCustom
            .filter { format == .halfFrame ? $0.formats.contains(.f135) : $0.formats.contains { $0.is120 == format.is120 } }
            .filter { search.isEmpty || $0.displayName.localizedCaseInsensitiveContains(search) }
        // 최근 쓴 순 → 기록이 없으면 많이 쓰는 필름 순
        func rank(_ s: FilmStock) -> (Int, Int) {
            (recent.firstIndex(of: s.id) ?? .max, Self.popular.firstIndex(of: s.id) ?? .max)
        }
        return list.sorted { rank($0) < rank($1) }
    }

    private static let popular = ["kodak-portra-400", "kodak-gold-200", "ilford-hp5-plus", "kodak-ultramax-400",
                                  "fuji-400", "kodak-trix-400", "cinestill-800t", "kodak-ektar-100"]

    /// 기본은 6개만. 선택한 필름이 뒤에 있으면 함께 보여준다.
    private var visibleStocks: [FilmStock] {
        if showAllFilms { return stocks }
        var top = Array(stocks.prefix(6))
        if let film, !top.contains(film), stocks.contains(film) { top[top.count - 1] = film }
        return top
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

                Section {
                    if showAllFilms {
                        TextField("필름 검색", text: $search)
                    }
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 92), spacing: 6)], spacing: 10) {
                        ForEach(visibleStocks) { stock in
                            Button { filmID = stock.id } label: {
                                VStack(spacing: 2) {
                                    FilmCanisterView(stock: stock, format: camera?.format ?? .f135)
                                        .frame(height: 84)
                                    Text(stock.displayName).font(.caption2).lineLimit(2).multilineTextAlignment(.center)
                                        .frame(height: 28, alignment: .top)
                                }
                                .padding(4)
                                .background(RoundedRectangle(cornerRadius: 10)
                                    .fill(filmID == stock.id ? Theme.safelight.opacity(0.15) : .clear))
                                .overlay(RoundedRectangle(cornerRadius: 10)
                                    .strokeBorder(filmID == stock.id ? Theme.safelight : .clear, lineWidth: 2))
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
                    if let film, film.isCustom, let item = customFilms.first(where: { $0.id == film.id }) {
                        Button("\(film.displayName) 수정", systemImage: "pencil") { customEdit = .edit(item) }
                            .frame(maxWidth: .infinity)
                    }
                    Button {
                        withAnimation { showAllFilms.toggle() }
                        if !showAllFilms { search = "" }
                    } label: {
                        Label(showAllFilms ? "접기" : "더보기 (\(stocks.count)종)",
                              systemImage: showAllFilms ? "chevron.up" : "chevron.down")
                            .frame(maxWidth: .infinity)
                    }
                } header: {
                    Text(showAllFilms ? "필름" : "필름 · 최근 사용")
                }

                if let film {
                    Section {
                        Stepper(value: $pushPull, in: -2...3) {
                            LabeledContent("감도", value: pushPull == 0 ? "ISO \(film.iso)"
                                           : "ISO \(shotISO ?? film.iso) (\(pushPull > 0 ? "+" : "")\(pushPull) 스톱)")
                        }
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
            .sheet(item: $customEdit) { target in
                switch target {
                case .new: CustomFilmEditView(item: nil) { filmID = $0 }
                case .edit(let item): CustomFilmEditView(item: item) { filmID = $0 }
                }
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
                    }.disabled(camera == nil || film == nil || !lensReady)
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
                if let roll = c.loadedRoll {
                    Text(roll.filmName).font(.caption2).foregroundStyle(Theme.safelight).lineLimit(1)
                }
            }
            .frame(width: 104)
            .padding(6)
            .background(RoundedRectangle(cornerRadius: 12).fill(cameraID == c.id ? Theme.safelight.opacity(0.15) : Color.clear))
            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(cameraID == c.id ? Theme.safelight : .secondary.opacity(0.25),
                                                                      lineWidth: cameraID == c.id ? 2 : 1))
        }
        .buttonStyle(.plain)
    }

    private func load() async {
        guard let camera, let film else { return }
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
