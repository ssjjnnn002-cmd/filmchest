import SwiftUI
import SwiftData
import PhotosUI
import FilmScanCore

struct CameraEditView: View {
    let camera: CameraItem?

    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query private var cameras: [CameraItem]

    @State private var brand = ""
    @State private var model = ""
    @State private var nickname = ""
    @State private var format: FilmFormat = .f135
    @State private var interchangeable = false
    @State private var mount = ""
    @State private var fixedLens = ""
    @State private var manualStyle: CameraBodyStyle?        // nil이면 모델명으로 자동
    @State private var battery = ""
    @State private var hasBatteryDate = false
    @State private var batteryDate = Date()
    @State private var prewind: Bool?
    @State private var hasPurchaseDate = false
    @State private var purchaseDate = Date()
    @State private var price = ""
    @State private var seller = ""
    @State private var showCatalog = false
    @FocusState private var focus: Field?

    private enum Field { case brand, model }
    @State private var photo: Data?
    @State private var spin: [Data] = []
    @State private var pickerItem: PhotosPickerItem?
    @State private var lifting = false
    @State private var liftFailed = false
    @State private var canLift = false
    @State private var showCamera = false
    @State private var photoScale: Double = 1
    @State private var photoOffset = CGSize.zero          // 칸 크기 대비 비율
    @State private var dragStart: CGSize?
    @State private var pinchStart: Double?
    @State private var tags: [String] = []
    @State private var accessoryIDs: [UUID] = []

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    VStack(spacing: 12) {
                        ZStack {
                            preview.frame(height: 200)
                            if lifting { ProgressView("배경 지우는 중…").padding().background(.regularMaterial, in: .rect(cornerRadius: 10)) }
                        }
                        Text(previewCaption).font(.caption).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .listRowSeparator(.hidden)
                    if photo != nil {
                        HStack {
                            Text("크기")
                            Slider(value: $photoScale, in: 0.3...3, step: 0.05)
                            Button("기본") { photoScale = 1; photoOffset = .zero }
                                .buttonStyle(.borderless)
                                .disabled(photoScale == 1 && photoOffset == .zero)
                        }
                        Text("사진을 끌어서 옮기고, 두 손가락으로 키우거나 줄여요. 칸 밖은 잘려요.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    if photo == nil && spin.isEmpty {
                        styleRow
                    }
                    #if os(iOS)
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        Button("사진 찍기", systemImage: "camera") { showCamera = true }
                    }
                    #endif
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        Label("앨범에서 사진 고르기", systemImage: "photo")
                    }
                    if canLift, let current = photo {
                        Button("배경 지우기", systemImage: "wand.and.stars") {
                            Task {
                                lifting = true
                                if let lifted = await SubjectLifter.lift(current) { photo = lifted; canLift = false } else { liftFailed = true }
                                lifting = false
                            }
                        }
                        .disabled(lifting)
                    }
                    if photo != nil || !spin.isEmpty {
                        Button("사진 지우고 기본 모형 쓰기", systemImage: "trash", role: .destructive) {
                            photo = nil
                            spin = []
                            liftFailed = false
                        }
                    }
                } header: {
                    Text("외관")
                } footer: {
                    if liftFailed {
                        Text("카메라를 찾지 못해 배경을 지우지 못했어요. 단색 배경에서 찍은 사진으로 다시 해 보세요.")
                    } else if photo == nil && spin.isEmpty {
                        Text("사진이 없으면 고른 형태의 기본 모형으로 보여요.")
                    }
                }

                Section {
                    TextField("제조사", text: $brand)
                        .focused($focus, equals: .brand)
                        .autocorrectionDisabled()
                    if focus == .brand {
                        brandSuggestions
                    }
                    TextField("모델", text: $model)
                        .focused($focus, equals: .model)
                        .autocorrectionDisabled()
                    if focus == .model {
                        modelSuggestions
                    }
                    TextField("별명 (선택)", text: $nickname)
                    Picker("포맷", selection: $format) {
                        ForEach(FilmFormat.allCases, id: \.self) { Text($0.displayName).tag($0) }
                    }
                } header: {
                    HStack {
                        Text("카메라")
                        Spacer()
                        Button("목록에서 고르기") { showCatalog = true }
                            .font(.caption.weight(.semibold))
                            .textCase(nil)
                    }
                } footer: {
                    if let known = CameraCatalog.match(brand: brand, model: model) {
                        Label("\(known.kindText)로 자동 설정했어요.", systemImage: "checkmark.circle")
                    }
                }

                TagField(tags: $tags)

                Section("렌즈") {
                    Toggle("렌즈 교환식", isOn: $interchangeable)
                    if interchangeable {
                        TextField("마운트", text: $mount)
                    } else {
                        TextField("렌즈", text: $fixedLens)
                    }
                }

                Section {
                    TextField("배터리 종류", text: $battery)
                    HStack {
                        DatePicker(selection: Binding(get: { batteryDate }, set: { batteryDate = $0; hasBatteryDate = true }), displayedComponents: .date) {
                            VStack(alignment: .leading, spacing: 1) {
                                Text("마지막 교체")
                                if !hasBatteryDate { Text("기록 안 함").font(.caption).foregroundStyle(.secondary) }
                            }
                        }
                        if hasBatteryDate {
                            Button { hasBatteryDate = false } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                                .buttonStyle(.borderless)
                        }
                    }
                } header: {
                    Text("배터리")
                } footer: {
                    Text("교체한 지 1년이 지나면 내 장비에서 알려 드려요.")
                }

                PurchaseFields(hasDate: $hasPurchaseDate, date: $purchaseDate, price: $price, seller: $seller)

                AccessoryLinkFields(ids: $accessoryIDs, bodyPrice: price)

                Section {
                    HStack(spacing: 8) {
                        windChoice(title: "정순", detail: "1 → 끝", value: false)
                        windChoice(title: "프리와인딩", detail: "끝 → 1", value: true)
                    }
                } header: {
                    Text("필름 감기")
                } footer: {
                    Text(prewind == nil
                         ? "아직 고르지 않았어요. 노출계를 열면 한 번 묻고, 고른 쪽이 이 카메라에 저장돼요."
                         : "프리와인딩은 필름을 먼저 끝까지 감아 두고 카운트가 거꾸로 줄어드는 카메라예요.")
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .navigationTitle(camera == nil ? "카메라 추가" : "카메라 수정")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("취소") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("저장") { save() }
                        .disabled(brand.nilIfBlank == nil || model.nilIfBlank == nil || lifting)
                }
            }
            .onAppear(perform: load)
            // 직접 입력한 이름이 아는 모델과 같으면 비어 있는 정보만 채운다
            .onChange(of: "\(brand)|\(model)") { _, _ in
                guard let known = CameraCatalog.match(brand: brand, model: model),
                      mount.isEmpty, fixedLens.isEmpty else { return }
                format = known.format
                interchangeable = known.isInterchangeable
                mount = known.mount ?? ""
                fixedLens = known.lens ?? ""
                if battery.isEmpty, let b = known.battery { battery = b }
            }
            .sheet(isPresented: $showCatalog) {
                CameraCatalogPicker { apply($0) }
            }
            .onChange(of: pickerItem) { _, item in
                guard let item else { return }
                Task { await usePhoto(try? await item.loadTransferable(type: Data.self)) }
            }
            #if os(iOS)
            .fullScreenCover(isPresented: $showCamera) {
                SystemCameraPicker { data in
                    showCamera = false
                    if let data { Task { await usePhoto(data) } }
                }
                .ignoresSafeArea()
            }
            #endif
        }
        #if os(macOS)
        .frame(minWidth: 480, minHeight: 680)
        #endif
    }

    @ViewBuilder
    private var preview: some View {
        if !spin.isEmpty {
            SpinViewer(frames: spin)
        } else if let photo {
            GeometryReader { geo in
                CameraImageView(data: photo)
                    .scaleEffect(photoScale)
                    .offset(x: photoOffset.width * geo.size.width, y: photoOffset.height * geo.size.height)
                    .frame(width: geo.size.width, height: geo.size.height)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture()
                            .onChanged { v in
                                let base = dragStart ?? photoOffset
                                dragStart = base
                                photoOffset = CGSize(width: base.width + v.translation.width / max(geo.size.width, 1),
                                                     height: base.height + v.translation.height / max(geo.size.height, 1))
                            }
                            .onEnded { _ in dragStart = nil }
                            .simultaneously(with: MagnifyGesture()
                                .onChanged { v in
                                    let base = pinchStart ?? photoScale
                                    pinchStart = base
                                    photoScale = min(max(base * v.magnification, 0.3), 3)
                                }
                                .onEnded { _ in pinchStart = nil })
                    )
            }
            .clipped()
        } else {
            DummyCamera3DView(id: DummyModelID(brand: brand, model: model, style: style), colorHex: CameraBodyStyle.defaultColorHex)
        }
    }

    private var previewCaption: String {
        if !spin.isEmpty { return "360° 사진 \(spin.count)장" }
        if photo != nil { return "사진 한 장" }
        return "기본 모형 · 끌어서 돌려 보기"
    }

    /// 모델명으로 정한 형태
    private var autoStyle: CameraBodyStyle {
        CameraBodyStyle.infer(brand: brand, model: model, format: format, interchangeable: interchangeable)
    }

    private var style: CameraBodyStyle { manualStyle ?? autoStyle }

    /// 형태: 기본은 자동, 필요하면 바꾸기
    private var styleRow: some View {
        LabeledContent("형태") {
            Menu {
                ForEach(CameraBodyStyle.allCases) { s in
                    Button { manualStyle = s } label: {
                        if style == s { Label(s.displayName, systemImage: "checkmark") } else { Text(s.displayName) }
                    }
                }
            } label: {
                Text(style.displayName)
            }
        }
    }

    private func windChoice(title: String, detail: String, value: Bool) -> some View {
        let on = prewind == value
        return Button { prewind = value } label: {
            VStack(spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold))
                Text(detail).font(.caption2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
        .buttonStyle(.bordered)
        .tint(on ? Theme.safelight : .secondary)
    }

    private func load() {
        guard let camera else { return }
        brand = camera.brand
        model = camera.model
        nickname = camera.nickname ?? ""
        format = camera.format
        interchangeable = camera.isInterchangeable
        mount = camera.mount ?? ""
        fixedLens = camera.fixedLensName ?? ""
        photo = camera.photo
        spin = camera.spinFrames
        photoScale = camera.photoScale
        photoOffset = CGSize(width: camera.photoOffsetX, height: camera.photoOffsetY)
        tags = camera.tags
        accessoryIDs = camera.accessoryIDs
        manualStyle = camera.bodyStyleManual ? camera.bodyStyle : nil
        battery = camera.batteryType ?? ""
        hasBatteryDate = camera.batteryReplacedAt != nil
        batteryDate = camera.batteryReplacedAt ?? Date()
        prewind = camera.prewind
        hasPurchaseDate = camera.purchasedAt != nil
        purchaseDate = camera.purchasedAt ?? Date()
        price = camera.price ?? ""
        seller = camera.seller ?? ""
    }

    // MARK: 자동완성

    /// 제조사 칩
    private var brandSuggestions: some View {
        let list = brand.isEmpty ? CameraCatalog.brands : CameraCatalog.brands(matching: brand)
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(list, id: \.self) { b in
                    Button(b) {
                        brand = b
                        focus = .model
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }
        }
    }

    /// 모델 추천: 고르면 형태/포맷/렌즈/배터리까지 채운다
    private var modelSuggestions: some View {
        let hits = CameraCatalog.models(brand: brand, matching: model)
        let exact = CameraCatalog.match(brand: brand, model: model)
        let list = (exact.map { [$0] } ?? []) + hits.filter { $0 != exact }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Array(list.prefix(24))) { cam in
                    Button(brand.isEmpty ? cam.displayName : cam.model) { apply(cam) }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                }
            }
        }
    }

    /// 카탈로그 정보로 채우기
    private func apply(_ cam: CatalogCamera) {
        brand = cam.brand
        model = cam.model
        format = cam.format
        interchangeable = cam.isInterchangeable
        mount = cam.mount ?? ""
        fixedLens = cam.lens ?? ""
        if let b = cam.battery { battery = b }
        manualStyle = nil
        focus = nil
    }

    private func usePhoto(_ data: Data?) async {
        guard let data else { return }
        lifting = true
        liftFailed = false
        photoScale = 1
        photoOffset = .zero
        // 배경이 이미 투명한 PNG는 그대로, 그냥 사진은 사진 그대로 (배경 지우기는 버튼으로 고를 때만)
        if let ready = await SubjectLifter.alreadyTransparent(data) {
            photo = ready
            canLift = false
        } else {
            photo = data
            canLift = true
        }
        lifting = false
    }

    private func save() {
        let target = camera ?? {
            let c = CameraItem(brand: "", model: "")
            c.sortOrder = (cameras.map(\.sortOrder).max() ?? 0) + 1
            context.insert(c)
            return c
        }()
        target.brand = brand.trimmingCharacters(in: .whitespaces)
        target.model = model.trimmingCharacters(in: .whitespaces)
        target.nickname = nickname.nilIfBlank
        target.format = format
        target.mount = interchangeable ? mount.nilIfBlank : nil
        target.fixedLensName = interchangeable ? nil : fixedLens.nilIfBlank
        target.bodyStyle = style
        target.bodyStyleManual = manualStyle != nil
        target.modelColorHex = CameraBodyStyle.defaultColorHex
        target.batteryType = battery.nilIfBlank
        target.batteryReplacedAt = hasBatteryDate ? batteryDate : nil
        target.prewind = prewind
        target.purchasedAt = hasPurchaseDate ? purchaseDate : nil
        target.price = PriceText.grouped(price).nilIfBlank
        target.seller = seller.nilIfBlank
        if let place = seller.nilIfBlank { SellerDirectory.remember(place) }
        target.photo = photo
        target.spinFrames = spin
        target.photoScale = photoScale
        target.photoOffsetX = photoOffset.width
        target.photoOffsetY = photoOffset.height
        target.tags = tags
        target.accessoryIDs = accessoryIDs
        for roll in target.rolls ?? [] { roll.rememberCamera() }
        dismiss()
    }
}

/// 앱이 아는 카메라 목록에서 고르기
struct CameraCatalogPicker: View {
    var onPick: (CatalogCamera) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private var grouped: [(brand: String, cameras: [CatalogCamera])] {
        let q = search.lowercased()
        let list = CameraCatalog.all.filter { q.isEmpty || $0.displayName.lowercased().contains(q) }
        return Dictionary(grouping: list, by: \.brand).map { ($0.key, $0.value) }.sorted { $0.brand < $1.brand }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(grouped, id: \.brand) { group in
                    Section(group.brand) {
                        ForEach(group.cameras) { cam in
                            Button {
                                onPick(cam)
                                dismiss()
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(cam.model).foregroundStyle(.primary)
                                    Text([cam.kindText, cam.battery].compactMap { $0 }.joined(separator: " · "))
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }
            }
            .searchable(text: $search, prompt: "제조사나 모델 검색")
            .navigationTitle("카메라 목록")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
            }
        }
        #if os(macOS)
        .frame(minWidth: 460, minHeight: 600)
        #endif
    }
}
