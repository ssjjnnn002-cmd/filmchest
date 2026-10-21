import SwiftUI
import SwiftData
import FilmScanCore

struct CameraDetailView: View {
    @Bindable var camera: CameraItem
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var showEdit = false
    @State private var confirmDelete = false
    @State private var editingLens: LensItem?
    @State private var addingLens = false
    @Query(sort: \LensItem.createdAt) private var allLenses: [LensItem]
    @Query(sort: \FilterItem.createdAt) private var allAccessories: [FilterItem]
    @State private var confirmBattery = false

    private var myAccessories: [FilterItem] { camera.accessoryIDs.compactMap { id in allAccessories.first { $0.id == id } } }

    private var lenses: [LensItem] {
        if camera.lensesChosen {
            let ids = camera.linkedLensIDs
            return ids.compactMap { id in allLenses.first { $0.id == id } }
        }
        guard let mount = camera.mount?.nilIfBlank else { return [] }
        return allLenses.filter { $0.mount.caseInsensitiveCompare(mount) == .orderedSame }
    }

    private func attach(_ lens: LensItem) {
        var ids = camera.lensesChosen ? camera.linkedLensIDs : lenses.map(\.id)
        if !ids.contains(lens.id) { ids.append(lens.id) }
        camera.linkedLensIDs = ids
        camera.lensesChosen = true
    }

    private func detach(_ lens: LensItem) {
        let ids = (camera.lensesChosen ? camera.linkedLensIDs : lenses.map(\.id)).filter { $0 != lens.id }
        camera.linkedLensIDs = ids
        camera.lensesChosen = true
    }

    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    CameraCoverView(camera: camera, interactive: true)
                        .frame(height: 240)
                        .shadow(color: .black.opacity(0.25), radius: 10, y: 8)
                    Text(camera.displayName).font(.title2.bold())
                    Text(specText).font(.subheadline).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .listRowBackground(Color.clear)
            }

            // 태그는 들어오자마자 보이고 바로 고친다
            TagField(tags: $camera.tags)

            Section {
                if camera.batteryNotNeeded {
                    LabeledContent("배터리", value: camera.batteryType ?? "")
                } else {
                    LabeledContent("종류", value: camera.batteryType ?? "모름")
                    DatePicker(selection: Binding(get: { camera.batteryReplacedAt ?? Date() },
                                                  set: { camera.batteryReplacedAt = $0 }),
                               in: ...Date(), displayedComponents: .date) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("마지막 교체")
                            Text(camera.batteryAgeText ?? "기록 없음").font(.caption)
                                .foregroundStyle(camera.batteryDue ? .orange : .secondary)
                        }
                    }
                    Button("오늘 교체함", systemImage: "battery.100.bolt") { confirmBattery = true }
                        .confirmationDialog("오늘 배터리를 교체했나요?", isPresented: $confirmBattery, titleVisibility: .visible) {
                            Button("오늘 교체함") { camera.batteryReplacedAt = Date() }
                        }
                }
            } header: {
                Text("배터리")
            } footer: {
                if camera.batteryDue {
                    Text("교체한 지 1년이 넘었어요. 노출계가 정확하지 않을 수 있어요.").foregroundStyle(.orange)
                }
            }

            if camera.price?.nilIfBlank != nil || !myAccessories.isEmpty {
                Section {
                    if let p = camera.price?.nilIfBlank { LabeledContent("본체", value: PriceSum.text(PriceSum.value(p))) }
                    ForEach(myAccessories) { a in
                        LabeledContent(a.name, value: a.price?.nilIfBlank.map { PriceSum.text(PriceSum.value($0)) } ?? "-")
                    }
                    LabeledContent("합계") {
                        Text(PriceSum.text(PriceSum.value(camera.price) + myAccessories.reduce(0) { $0 + PriceSum.value($1.price) }))
                            .font(.body.weight(.semibold)).foregroundStyle(.primary)
                    }
                } header: {
                    Text("쓴 금액")
                }
            }

            Section("장착된 필름") {
                if let roll = camera.loadedRoll {
                    NavigationLink(value: roll) { RollRow(roll: roll) }
                } else {
                    Button("필름 장착하기", systemImage: "film") { router.loadFilm(camera: camera) }
                }
            }

            if camera.isInterchangeable {
                Section {
                    ForEach(lenses) { lens in
                        Button { editingLens = lens } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(lens.displayName).lineLimit(1)
                                    if !lens.specLine.isEmpty {
                                        Text(lens.specLine).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                                    }
                                }
                                Spacer()
                                Text("\((lens.rolls ?? []).count)롤").foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            Button("수정", systemImage: "pencil") { editingLens = lens }
                            Button("이 카메라에서 빼기", systemImage: "minus.circle", role: .destructive) { detach(lens) }
                        }
                        .swipeActions {
                            Button("빼기", role: .destructive) { detach(lens) }
                        }
                    }
                    Button("렌즈 추가", systemImage: "plus") { addingLens = true }
                } header: {
                    Text("렌즈 · \(camera.mount ?? "")")
                } footer: {
                    Text("렌즈 탭에 등록한 렌즈를 불러와요. 여기서 빼도 렌즈 탭의 등록은 남아요.")
                }
            }

            let history = camera.sortedRolls.filter { $0.status != .loaded }
            Section("필름 기록 · \(history.count)롤") {
                if history.isEmpty {
                    Text("아직 기록이 없어요").foregroundStyle(.secondary)
                }
                ForEach(history) { roll in
                    NavigationLink(value: roll) { RollRow(roll: roll) }
                }
            }

            if !filmStats.isEmpty {
                Section("자주 쓴 필름") {
                    ForEach(filmStats, id: \.name) { stat in
                        LabeledContent(stat.name, value: "\(stat.count)롤")
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper)
        .navigationTitle(camera.model)
        .toolbar {
            ToolbarItem {
                Menu("더 보기", systemImage: "ellipsis.circle") {
                    Button("수정", systemImage: "pencil") { showEdit = true }
                    Button("삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                }
            }
        }
        .sheet(isPresented: $showEdit) { CameraEditView(camera: camera) }
        .sheet(item: $editingLens) { LensEditView(lens: $0, mount: camera.mount ?? "") }
        .sheet(isPresented: $addingLens) { LensLibrarySheet(camera: camera, shown: lenses) }
        .confirmationDialog("이 카메라를 삭제할까요? 필름에 적힌 카메라 정보는 남아요.", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("삭제", role: .destructive) {
                camera.moveToTrash()
                dismiss()
            }
        } message: {
            Text("24시간 안에는 설정에서 되돌릴 수 있어요.")
        }
    }

    private var specText: String {
        var parts = [camera.format.displayName]
        if let mount = camera.mount?.nilIfBlank { parts.append("\(mount) 마운트") }
        if let lens = camera.fixedLensName?.nilIfBlank { parts.append(lens) }
        return parts.joined(separator: " · ")
    }

    private var filmStats: [(name: String, count: Int)] {
        Dictionary(grouping: (camera.rolls ?? []).filter { $0.deletedAt == nil }, by: \.filmName)
            .map { ($0.key, $0.value.count) }
            .sorted { $0.1 > $1.1 }
    }
}

/// 렌즈 탭에 등록된 렌즈를 이 카메라에 붙인다.
struct LensLibrarySheet: View {
    @Bindable var camera: CameraItem
    let shown: [LensItem]
    @Query(sort: \LensItem.createdAt) private var all: [LensItem]
    @Environment(\.dismiss) private var dismiss

    private var available: [LensItem] {
        let taken = Set(shown.map(\.id))
        let mount = camera.mount?.nilIfBlank?.lowercased()
        return all.filter { !taken.contains($0.id) }.sorted { a, b in
            let am = mount != nil && a.mount.lowercased() == mount
            let bm = mount != nil && b.mount.lowercased() == mount
            if am != bm { return am && !bm }
            return a.createdAt < b.createdAt
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if all.isEmpty {
                    ContentUnavailableView {
                        Label("등록된 렌즈가 없어요", systemImage: "camera.aperture")
                    } description: {
                        Text("렌즈 탭에서 렌즈를 먼저 등록해 주세요.")
                    }
                } else if available.isEmpty {
                    ContentUnavailableView {
                        Label("이미 불러온 렌즈예요", systemImage: "checkmark.circle")
                    } description: {
                        Text("렌즈 탭에 있는 렌즈는 이 카메라에 다 있어요.")
                    }
                } else {
                    List(available) { lens in
                        Button {
                            var ids = camera.lensesChosen ? camera.linkedLensIDs : shown.map(\.id)
                            if !ids.contains(lens.id) { ids.append(lens.id) }
                            camera.linkedLensIDs = ids
                            camera.lensesChosen = true
                            dismiss()
                        } label: {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(lens.displayName)
                                if !lens.specLine.isEmpty {
                                    Text(lens.specLine).font(.caption).foregroundStyle(.secondary)
                                }
                                if let mount = camera.mount?.nilIfBlank, lens.mount.caseInsensitiveCompare(mount) != .orderedSame {
                                    Text(lens.mount).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("렌즈 불러오기")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } } }
        }
        #if os(macOS)
        .frame(minWidth: 420, minHeight: 480)
        #endif
    }
}

/// 렌즈 추가/수정/삭제
struct LensEditView: View {
    let lens: LensItem?
    var mount: String = ""
    var brand = ""
    var mountEditable = false

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @State private var lensBrand = ""
    @State private var model = ""
    @State private var mountText = ""
    @State private var zoom = false
    @State private var focalMin = ""
    @State private var focalMax = ""
    @State private var apertureOpen = ""
    @State private var apertureClose = ""
    @State private var photo: Data?
    @State private var confirmDelete = false
    @State private var hasPurchaseDate = false
    @State private var purchaseDate = Date()
    @State private var price = ""
    @State private var seller = ""
    @State private var tags: [String] = []

    private var currentMount: String { mountEditable ? mountText : mount }

    var body: some View {
        NavigationStack {
            Form {
                GearPhotoEditor(photo: $photo, symbol: "camera.aperture")
                Section(mountEditable ? "렌즈" : "렌즈 · \(mount)") {
                    if mountEditable {
                        TextField("마운트", text: $mountText)
                    }
                    TextField("제조사", text: $lensBrand)
                    TextField("렌즈", text: $model)
                    LensSuggestions(mount: currentMount, text: $model, onPick: applyOptics)
                }
                TagField(tags: $tags)
                Section("사양") {
                    Picker("종류", selection: $zoom) {
                        Text("단렌즈").tag(false)
                        Text("줌렌즈").tag(true)
                    }
                    if zoom {
                        specField("짧은 화각", text: $focalMin, unit: "mm", numeric: true)
                        specField("긴 화각", text: $focalMax, unit: "mm", numeric: true)
                    } else {
                        specField("화각", text: $focalMin, unit: "mm", numeric: true)
                    }
                    specField("최대개방", text: $apertureOpen, unit: "f/", leading: true, numeric: false)
                    specField("최소개방", text: $apertureClose, unit: "f/", leading: true, numeric: false)
                }
                PurchaseFields(hasDate: $hasPurchaseDate, date: $purchaseDate, price: $price, seller: $seller)
                if lens != nil {
                    Section {
                        Button("렌즈 삭제", systemImage: "trash", role: .destructive) { confirmDelete = true }
                    } footer: {
                        Text("이 렌즈로 찍은 롤 기록은 남아요.")
                    }
                }
            }
            .formStyle(.grouped)
            .navigationTitle(lens == nil ? "렌즈 추가" : "렌즈 수정")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save() }
                        .disabled(model.nilIfBlank == nil || (mountEditable && mountText.nilIfBlank == nil))
                }
            }
            .confirmationDialog("이 렌즈를 삭제할까요?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("삭제", role: .destructive) {
                    if let lens { context.delete(lens) }
                    dismiss()
                }
            }
            .onAppear(perform: load)
        }
        #if os(macOS)
        .frame(minWidth: 420, minHeight: 520)
        #endif
    }

    private func load() {
        lensBrand = lens?.brand ?? brand
        model = lens?.model ?? ""
        mountText = lens?.mount ?? mount
        let parsed = LensOptics.parse(model)
        if let lens, lens.focalMin > 0 || lens.zoomLens || lens.apertureOpen.nilIfBlank != nil {
            zoom = lens.zoomLens || lens.focalMax > lens.focalMin
            focalMin = lens.focalMin > 0 ? String(lens.focalMin) : ""
            focalMax = lens.focalMax > lens.focalMin ? String(lens.focalMax) : ""
            apertureOpen = lens.apertureOpen.nilIfBlank ?? parsed.open
            apertureClose = lens.apertureClose.nilIfBlank ?? parsed.close
        } else {
            applyOptics(model)
            if apertureClose.isEmpty, let saved = lens?.apertureClose.nilIfBlank {
                apertureClose = saved
            }
        }
        photo = lens?.photo
        hasPurchaseDate = lens?.purchasedAt != nil
        purchaseDate = lens?.purchasedAt ?? Date()
        price = lens?.price ?? ""
        seller = lens?.seller ?? ""
        tags = lens?.tags ?? []
    }

    private func applyOptics(_ name: String) {
        let parsed = LensOptics.parse(name)
        zoom = parsed.zoom
        focalMin = parsed.focalMin > 0 ? String(parsed.focalMin) : ""
        focalMax = parsed.zoom && parsed.focalMax > parsed.focalMin ? String(parsed.focalMax) : ""
        apertureOpen = parsed.open
        apertureClose = parsed.close
    }

    private func specField(_ title: String, text: Binding<String>, unit: String, leading: Bool = false, numeric: Bool) -> some View {
        HStack(spacing: 6) {
            Text(title)
            Spacer(minLength: 8)
            if leading {
                Text(unit).foregroundStyle(.secondary)
            }
            TextField(leading ? "1.4" : "50", text: text)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 120)
                #if os(iOS)
                .keyboardType(numeric ? .numberPad : .decimalPad)
                #endif
            if !leading {
                Text(unit).foregroundStyle(.secondary)
            }
        }
    }

    private func digits(_ text: String) -> Int { Int(text.filter(\.isNumber)) ?? 0 }

    private func cleanStop(_ raw: String) -> String {
        var text = raw.trimmingCharacters(in: .whitespaces)
        if text.lowercased().hasPrefix("f/") { text = String(text.dropFirst(2)).trimmingCharacters(in: .whitespaces) }
        return text
    }

    private func save() {
        let minFocal = digits(focalMin)
        let maxFocal = zoom ? digits(focalMax) : minFocal
        let target = lens ?? {
            let item = LensItem(brand: "", model: "", mount: currentMount.trimmingCharacters(in: .whitespaces))
            context.insert(item)
            return item
        }()
        target.brand = lensBrand.trimmingCharacters(in: .whitespaces)
        target.model = model.trimmingCharacters(in: .whitespaces)
        if mountEditable { target.mount = mountText.trimmingCharacters(in: .whitespaces) }
        target.zoomLens = zoom
        target.focalMin = minFocal
        target.focalMax = maxFocal
        target.apertureOpen = cleanStop(apertureOpen)
        target.apertureClose = cleanStop(apertureClose)
        target.photo = photo
        target.purchasedAt = hasPurchaseDate ? purchaseDate : nil
        target.price = PriceText.grouped(price).nilIfBlank
        target.seller = seller.nilIfBlank
        target.tags = tags
        if let place = seller.nilIfBlank { SellerDirectory.remember(place) }
        dismiss()
    }
}

/// 마운트에 맞는 잘 알려진 렌즈 추천. 누르면 입력칸을 채운다.
struct LensSuggestions: View {
    let mount: String?
    @Binding var text: String
    var onPick: (String) -> Void = { _ in }

    var body: some View {
        let list = LensCatalog.lenses(for: mount, matching: text).filter { $0 != text }.prefix(6)
        ForEach(Array(list), id: \.self) { name in
            Button {
                text = name
                onPick(name)
            } label: {
                Label(name, systemImage: "camera.aperture").foregroundStyle(.secondary)
            }
        }
    }
}
