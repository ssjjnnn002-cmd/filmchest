import SwiftUI
import SwiftData
#if os(iOS)
import UIKit
#endif
import FilmScanCore

/// 내 장비: 카메라 카드 (그리드/목록)
struct LibraryView: View {
    @Environment(Router.self) private var router
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\CameraItem.sortOrder), SortDescriptor(\CameraItem.createdAt)])
    private var cameras: [CameraItem]
    @State private var showAddCamera = false
    @State private var showSettings = false
    @State private var cardFrames: [UUID: CGRect] = [:]
    @State private var order: [UUID] = []
    @State private var dragging: UUID?
    @State private var finger: CGPoint?
    @State private var dragSize: CGSize = CGSize(width: 160, height: 220)
    /// 누른 지점이 카드 왼쪽 위에서 얼마나 떨어져 있는지 (카드가 손가락 아래 그대로 따라오게)
    @State private var grabOffset: CGSize = .zero
    /// 순서 편집 중: 카드가 흔들리고, 눌러도 들어가지 않는다. 바로 끌 수 있다.
    @State private var editing = false
    @AppStorage("libraryLayout") private var layout: LayoutMode = .grid
    @State private var gear: GearTab = .camera
    @State private var showAddLens = false
    @State private var showAddFilter = false
    @State private var showAddFilm = false
    @State private var tagFilter: String?
    @State private var search = ""
    @AppStorage("gearGrouped") private var grouped = false
    @Query private var lensTagSource: [LensItem]
    @Query private var filterTagSource: [FilterItem]

    private var visible: [CameraItem] {
        let q = search.trimmingCharacters(in: .whitespaces)
        return cameras.filter { c in
            guard c.deletedAt == nil else { return false }
            if editing { return true }
            if let tagFilter, !c.tags.contains(tagFilter) { return false }
            return q.isEmpty || ([c.displayName, c.nickname ?? "", c.mount ?? "", c.fixedLensName ?? ""] + c.tags).contains { $0.localizedCaseInsensitiveContains(q) }
        }
    }
    private var hasCameras: Bool { cameras.contains { $0.deletedAt == nil } }
    /// 태그로 묶었을 때는 순서 바꾸기 없이 묶음마다 보여 준다
    private var showGrouped: Bool { grouped && !editing && gear == .camera }

    /// 지금 탭의 장비에 붙은 태그 (많이 쓴 순)
    private var tabTags: [String] {
        let all: [String]
        switch gear {
        case .camera: all = cameras.filter { $0.deletedAt == nil }.flatMap(\.tags)
        case .lens: all = lensTagSource.flatMap(\.tags)
        case .filter: all = filterTagSource.flatMap(\.tags)
        case .film: all = []
        }
        var count: [String: Int] = [:]
        all.forEach { count[$0, default: 0] += 1 }
        return count.keys.sorted { (count[$0]!, $1) > (count[$1]!, $0) }
    }
    private var emptyCameras: Int { visible.filter { $0.loadedRoll == nil }.count }

    private var orderedCameras: [CameraItem] {
        let map = Dictionary(uniqueKeysWithValues: visible.map { ($0.id, $0) })
        let known = order.compactMap { map[$0] }
        let rest = visible.filter { !order.contains($0.id) }
        return known.isEmpty && order.isEmpty ? visible : known + rest
    }

    var body: some View {
        ScrollView {
            if !editing {
                Picker("장비", selection: $gear) {
                    ForEach(GearTab.allCases) { Text($0.title).tag($0) }
                }
                .onChange(of: gear) { tagFilter = nil; search = "" }
                .pickerStyle(.segmented)
                .labelsHidden()
                .padding(.horizontal)
                .padding(.top, 4)
                .padding(.bottom, 2)
                HStack(spacing: 8) {
                    HStack(spacing: 6) {
                        Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                        TextField("\(gear.title) 검색", text: $search)
                            .autocorrectionDisabled()
                        if !search.isEmpty {
                            Button { search = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.tertiary) }
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 10).padding(.vertical, 8)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 12))
                    if gear != .film {
                        Button {
                            withAnimation { grouped.toggle() }
                        } label: {
                            Label("태그별로 묶기", systemImage: "rectangle.3.group")
                                .labelStyle(.iconOnly)
                                .padding(9)
                                .foregroundStyle(grouped ? .white : Theme.safelight)
                                .background(grouped ? Theme.safelight : Theme.card, in: RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                        .accessibilityValue(grouped ? "켜짐" : "꺼짐")
                    }
                }
                .padding(.horizontal)
                if !tabTags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(tabTags, id: \.self) { t in
                                Button("#\(t)") { tagFilter = tagFilter == t ? nil : t }
                                    .buttonStyle(.bordered)
                                    .tint(tagFilter == t ? Theme.safelight : .secondary)
                                    .controlSize(.small)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
            }
            if gear != .camera && !editing {
                GearBrowser(tab: gear, layout: layout, tag: tagFilter, search: search, grouped: grouped)
                    .padding(.horizontal)
                    .padding(.vertical, 8)
            } else if hasCameras && visible.isEmpty {
                ContentUnavailableView("맞는 카메라가 없어요", systemImage: "magnifyingglass").padding(.top, 60)
            } else if showGrouped {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(Array(tagSections(orderedCameras, grouped: true, tags: \.tags).enumerated()), id: \.offset) { _, sec in
                        Text("\(sec.title ?? "") · \(sec.items.count)")
                            .font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                            .padding(.horizontal, 4)
                        if layout == .grid {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 160, maximum: 260), spacing: 12, alignment: .top)], spacing: 12) {
                                ForEach(sec.items) { camera in
                                    CameraCard(camera: camera, placeholder: false, tracksGesture: false,
                                               onLoadFilm: { router.loadFilm(camera: camera) }, onPhase: { _ in })
                                }
                            }
                        } else {
                            LazyVStack(spacing: 0) {
                                ForEach(sec.items) { camera in
                                    CameraListRow(camera: camera, placeholder: false, tracksGesture: false,
                                                  onLoadFilm: { router.loadFilm(camera: camera) }, onPhase: { _ in })
                                    if camera.id != sec.items.last?.id { Divider().padding(.leading, 96) }
                                }
                            }
                            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .frame(maxWidth: 1100)
                .frame(maxWidth: .infinity)
            } else if visible.isEmpty {
                ContentUnavailableView {
                    Label("카메라가 없어요", systemImage: "camera")
                } description: {
                    Text("가진 카메라를 등록해 보세요.")
                } actions: {
                    Button("카메라 추가") { showAddCamera = true }
                        .buttonStyle(.borderedProminent)
                }
                .padding(.top, 80)
            } else {
                VStack(spacing: 20) {
                    // 편집 중에도 배치는 그대로 (끄는 카드가 손가락에서 어긋나지 않게), 흐리게만
                    loadFilmBanner
                        .opacity(editing ? 0.4 : 1)
                        .allowsHitTesting(!editing)
                    if layout == .grid {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 160, maximum: 260), spacing: 12, alignment: .top)], spacing: 12) {
                            ForEach(orderedCameras) { camera in
                                CameraCard(camera: camera, placeholder: dragging == camera.id, editing: editing,
                                           onLoadFilm: { router.loadFilm(camera: camera) },
                                           onPhase: { handleDrag(camera.id, $0) })
                            }
                        }
                        .animation(.spring(duration: 0.28, bounce: 0.12), value: order)
                    } else {
                        LazyVStack(spacing: 0) {
                            ForEach(orderedCameras) { camera in
                                CameraListRow(camera: camera, placeholder: dragging == camera.id, editing: editing,
                                              onLoadFilm: { router.loadFilm(camera: camera) },
                                              onPhase: { handleDrag(camera.id, $0) })
                                if camera.id != orderedCameras.last?.id { Divider().padding(.leading, 96) }
                            }
                        }
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
                        .animation(.spring(duration: 0.28, bounce: 0.12), value: order)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .frame(maxWidth: 1100)
                .frame(maxWidth: .infinity)
                .onPreferenceChange(LibraryCardFrames.self) { cardFrames = $0 }
                // 길게 누르기 감지는 스크롤 화면 하나에만 붙이고, 누른 위치로 카드를 찾는다
                .background { HoldReorder(minimumDuration: editing ? 0.12 : 0.4, onPhase: handleGesture) }
            }
        }
        .overlay { dragOverlay }
        .onAppear {
            if order.isEmpty { order = visible.map(\.id) }
            AccessoryMigration.run(context)
        }
        .onChange(of: visible.map(\.id)) { _, ids in
            if dragging == nil { order = ids }
        }
        .background(Theme.paper)
        .navigationTitle("내 장비")
        .navigationDestination(for: CameraItem.self) { CameraDetailView(camera: $0) }
        .navigationDestination(for: RollItem.self) { RollDetailView(roll: $0) }
        .toolbar {
            if editing {
                ToolbarItem(placement: .principal) {
                    Text("끌어서 순서 바꾸기").font(.subheadline.weight(.semibold))
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("완료") { withAnimation(.snappy) { editing = false } }
                        .fontWeight(.semibold)
                }
            } else {
                #if os(iOS)
                ToolbarItem(placement: .topBarLeading) {
                    Button("설정", systemImage: "gearshape") { showSettings = true }
                }
                #endif
                ToolbarItem {
                    Button(layout.toggled.displayName, systemImage: layout.toggled.symbol) {
                        withAnimation { layout = layout.toggled }
                    }
                }
                ToolbarItem {
                    Button(gear == .camera ? "카메라 추가" : "\(gear.title) 추가", systemImage: "plus") {
                        switch gear {
                        case .camera: showAddCamera = true
                        case .lens: showAddLens = true
                        case .filter: showAddFilter = true
                        case .film: showAddFilm = true
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showAddCamera) { CameraEditView(camera: nil) }
        .sheet(isPresented: $showAddLens) { LensEditView(lens: nil, mountEditable: true) }
        .sheet(isPresented: $showAddFilter) { FilterEditView(filter: nil) }
        .sheet(isPresented: $showAddFilm) { FilmLotEditView(lot: nil) }
        .sheet(isPresented: $showSettings) { SettingsView() }
    }

    @ViewBuilder
    private var dragOverlay: some View {
        GeometryReader { geo in
            if let dragging, let camera = visible.first(where: { $0.id == dragging }), let finger {
                let origin = geo.frame(in: .global)
                Group {
                    if layout == .grid {
                        CameraCard(camera: camera, placeholder: false, editing: false, tracksGesture: false, onLoadFilm: {}, onPhase: { _ in })
                    } else {
                        CameraListRow(camera: camera, placeholder: false, editing: false, tracksGesture: false, onLoadFilm: {}, onPhase: { _ in })
                    }
                }
                .frame(width: dragSize.width, height: dragSize.height)
                .scaleEffect(1.04)
                .shadow(color: .black.opacity(0.18), radius: 18, y: 10)
                .position(x: finger.x - grabOffset.width + dragSize.width / 2 - origin.minX,
                          y: finger.y - grabOffset.height + dragSize.height / 2 - origin.minY)
                .allowsHitTesting(false)
            }
        }
        .allowsHitTesting(false)
    }

    /// 손가락이 다른 카드 중심에 가까워지면 그 칸으로 빈자리를 옮긴다.
    private func retarget(_ point: CGPoint) {
        guard let dragging,
              let current = cardFrames[dragging],
              let from = order.firstIndex(of: dragging) else { return }
        let here = hypot(point.x - current.midX, point.y - current.midY)
        var best: (index: Int, distance: CGFloat)?
        for (index, id) in order.enumerated() where id != dragging {
            guard let frame = cardFrames[id] else { continue }
            let distance = hypot(point.x - frame.midX, point.y - frame.midY)
            if best == nil || distance < best!.distance { best = (index, distance) }
        }
        guard let best, best.distance + 28 < here, best.index != from else { return }
        let target = best.index
        withAnimation(.spring(duration: 0.28, bounce: 0.12)) {
            let item = order.remove(at: from)
            order.insert(item, at: target)
        }
        Haptic.light()
    }

    /// 누른 위치에 있는 카드를 찾아 끌기를 시작한다 (카드가 아닌 곳이면 무시)
    private func handleGesture(_ phase: HoldReorder.Phase) {
        if case .began(let point) = phase {
            guard let id = cardFrames.first(where: { $0.value.contains(point) })?.key else { return }
            handleDrag(id, phase)
        } else if let id = dragging {
            handleDrag(id, phase)
        }
    }

    private func handleDrag(_ id: UUID, _ phase: HoldReorder.Phase) {
        switch phase {
        case .began(let point):
            if order.isEmpty { order = visible.map(\.id) }
            if !editing { withAnimation(.snappy) { editing = true } }
            dragging = id
            finger = point
            if let frame = cardFrames[id], frame.width > 1, frame.height > 1 {
                dragSize = frame.size
                grabOffset = CGSize(width: point.x - frame.minX, height: point.y - frame.minY)
            }
            Haptic.medium()
        case .moved(let point):
            finger = point
            // 손가락이 아니라 떠 있는 카드의 가운데로 가장 가까운 칸을 찾는다
            retarget(CGPoint(x: point.x - grabOffset.width + dragSize.width / 2,
                             y: point.y - grabOffset.height + dragSize.height / 2))
        case .ended:
            for (index, item) in order.enumerated() {
                visible.first { $0.id == item }?.sortOrder = index
            }
            try? context.save()
            dragging = nil
            finger = nil
        case .cancelled:
            order = visible.map(\.id)
            dragging = nil
            finger = nil
        }
    }

    /// 눈에 잘 띄는 필름 장착하기
    private var loadFilmBanner: some View {
        Button { router.loadFilm() } label: {
            HStack(spacing: 14) {
                FilmCanisterView(stock: FilmStockCatalog.stock(id: "kodak-portra-400"))
                    .frame(width: 44, height: 44)
                VStack(alignment: .leading, spacing: 2) {
                    Text("필름 장착하기").font(.headline)
                    Text(emptyCameras > 0 ? "빈 카메라 \(emptyCameras)대" : "모든 카메라에 필름이 들어 있어요")
                        .font(.caption).opacity(0.85)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.subheadline.weight(.semibold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(Theme.safelight, in: RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - 카메라 카드

/// 카드 한 장. 필름 유무와 상관없이 모든 카드의 높이와 구성이 같다.
private struct CameraCard: View {
    let camera: CameraItem
    var placeholder: Bool
    var editing = false
    var tracksGesture = true
    var onLoadFilm: () -> Void
    var onPhase: (HoldReorder.Phase) -> Void

    var body: some View {
        VStack(spacing: 0) {
            NavigationLink(value: camera) {
                VStack(alignment: .leading, spacing: 10) {
                    CameraCoverView(camera: camera)
                        .frame(height: 110)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 8)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(camera.model)
                            .font(.headline)
                            .lineLimit(1)
                        HStack(spacing: 4) {
                            Text(camera.brand)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                            if camera.batteryDue {
                                Label("배터리 교체", systemImage: "battery.25")
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(.orange)
                                    .lineLimit(1)
                            }
                        }
                        TagLine(tags: camera.tags)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(placeholder)

            Divider().padding(.vertical, 10)

            filmRow
                .frame(height: 30)
        }
        .allowsHitTesting(!editing)
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(.black.opacity(0.06)))
        .opacity(placeholder ? 0.28 : 1)
        .modifier(Wiggle(on: editing && !placeholder))
        .background {
            if tracksGesture {
                GeometryReader { geo in
                    Color.clear.preference(key: LibraryCardFrames.self, value: [camera.id: geo.frame(in: .global)])
                }
            }
        }
        .accessibilityHint("길게 눌러 순서를 바꿀 수 있어요")
    }

    /// 장착된 필름 또는 장착 버튼 (같은 높이)
    @ViewBuilder
    private var filmRow: some View {
        if let roll = camera.loadedRoll {
            NavigationLink(value: roll) {
                HStack(spacing: 8) {
                    FilmCanisterView(stock: roll.film, format: roll.format)
                        .frame(width: 30, height: 30)
                    Text(roll.filmName)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Theme.safelight)
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        } else {
            Button(action: onLoadFilm) {
                HStack(spacing: 6) {
                    Image(systemName: "plus")
                    Text("필름 장착")
                }
                .font(.caption.weight(.semibold))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .foregroundStyle(Theme.safelight)
                .background(Theme.safelight.opacity(0.12), in: Capsule())
            }
            .buttonStyle(.plain)
        }
    }
}

/// 목록 보기 한 줄
private struct CameraListRow: View {
    let camera: CameraItem
    var placeholder: Bool
    var editing = false
    var tracksGesture = true
    var onLoadFilm: () -> Void
    var onPhase: (HoldReorder.Phase) -> Void

    var body: some View {
        HStack(spacing: 14) {
          HStack(spacing: 14) {
            NavigationLink(value: camera) {
                HStack(spacing: 14) {
                    CameraCoverView(camera: camera)
                        .frame(width: 68, height: 52)
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 4) {
                            Text(camera.displayName).font(.subheadline.weight(.semibold)).lineLimit(1)
                            if camera.batteryDue {
                                Image(systemName: "battery.25").font(.caption).foregroundStyle(.orange)
                                    .accessibilityLabel("배터리 교체할 때가 됐어요")
                            }
                        }
                        if let roll = camera.loadedRoll {
                            Text(roll.filmName).font(.caption).foregroundStyle(Theme.safelight).lineLimit(1)
                        } else {
                            Text("비어 있음").font(.caption).foregroundStyle(.secondary)
                        }
                        TagLine(tags: camera.tags)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(placeholder)

            if let roll = camera.loadedRoll {
                FilmCanisterView(stock: roll.film, format: roll.format).frame(width: 34, height: 34)
            } else {
                Button(action: onLoadFilm) {
                    Label("필름 장착", systemImage: "plus").font(.caption.weight(.semibold))
                }
                .buttonStyle(.bordered)
                .tint(Theme.safelight)
                .controlSize(.small)
            }
          }
          .allowsHitTesting(!editing)
            if editing {
                Image(systemName: "line.3.horizontal").foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .opacity(placeholder ? 0.28 : 1)
        .background {
            if tracksGesture {
                GeometryReader { geo in
                    Color.clear.preference(key: LibraryCardFrames.self, value: [camera.id: geo.frame(in: .global)])
                }
            }
        }
    }
}

/// 순서 편집 중 카드가 살짝 흔들린다 (iOS 홈 화면처럼)
private struct Wiggle: ViewModifier {
    let on: Bool
    @State private var tilt = false

    func body(content: Content) -> some View {
        content
            .rotationEffect(.degrees(on ? (tilt ? 0.9 : -0.9) : 0))
            .onAppear { start() }
            .onChange(of: on) { _, _ in start() }
    }

    private func start() {
        guard on else { tilt = false; return }
        withAnimation(.easeInOut(duration: 0.14).repeatForever(autoreverses: true)) { tilt.toggle() }
    }
}

#if os(iOS)
/// 스크롤과 짧은 터치는 그대로 두고, 0.4초 꾹 누른 뒤에만 순서를 옮긴다.
private struct HoldReorder: UIViewRepresentable {
    enum Phase { case began(CGPoint), moved(CGPoint), ended(CGPoint), cancelled }
    /// 평소엔 0.4초 꾹, 편집 중엔 거의 바로
    var minimumDuration: Double = 0.4
    var onPhase: (Phase) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPhase: onPhase) }

    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.isUserInteractionEnabled = false
        view.backgroundColor = .clear
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        context.coordinator.onPhase = onPhase
        context.coordinator.minimumDuration = minimumDuration
        DispatchQueue.main.async { context.coordinator.attach(to: uiView) }
    }

    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        coordinator.detach()
    }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        var onPhase: (Phase) -> Void
        var minimumDuration: Double = 0.4 { didSet { press?.minimumPressDuration = minimumDuration } }
        weak var press: UILongPressGestureRecognizer?
        weak var host: UIView?
        weak var scroll: UIScrollView?

        init(onPhase: @escaping (Phase) -> Void) { self.onPhase = onPhase }

        func attach(to marker: UIView) {
            // 표시용 뷰가 아니라, 손가락이 항상 닿는 바깥 스크롤 화면에 붙인다
            var node: UIView? = marker.superview
            while let current = node, !(current is UIScrollView) { node = current.superview }
            guard let host = node ?? marker.window, self.host !== host else { return }
            detach()
            let press = UILongPressGestureRecognizer(target: self, action: #selector(handle(_:)))
            press.minimumPressDuration = minimumDuration
            press.allowableMovement = 10
            press.cancelsTouchesInView = true
            press.name = "filmchest.reorder"
            press.delaysTouchesBegan = false
            press.delaysTouchesEnded = false
            press.delegate = self
            host.addGestureRecognizer(press)
            self.press = press
            self.host = host
            scroll = host as? UIScrollView
        }

        func detach() {
            host?.gestureRecognizers?
                .filter { ($0 as? UILongPressGestureRecognizer)?.delegate === self }
                .forEach { host?.removeGestureRecognizer($0) }
            scroll?.isScrollEnabled = true
            host = nil
        }

        // 스크롤·버튼 등 SwiftUI 안쪽 제스처에 막히지 않게 같이 인식한다
        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
            true
        }

        func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldBeRequiredToFailBy other: UIGestureRecognizer) -> Bool {
            false
        }

        @objc func handle(_ gesture: UILongPressGestureRecognizer) {
            let point = gesture.location(in: nil)
            switch gesture.state {
            case .began:
                setScrollEnabled(false, from: gesture.view)
                onPhase(.began(point))
            case .changed:
                onPhase(.moved(point))
            case .ended:
                setScrollEnabled(true, from: gesture.view)
                onPhase(.ended(point))
            default:
                setScrollEnabled(true, from: gesture.view)
                onPhase(.cancelled)
            }
        }

        private func setScrollEnabled(_ enabled: Bool, from view: UIView?) {
            if scroll == nil {
                var current = view
                while let node = current {
                    if let found = node as? UIScrollView { scroll = found; break }
                    current = node.superview
                }
            }
            scroll?.isScrollEnabled = enabled
        }
    }
}

#else
/// Mac: 길게 눌러 순서 바꾸기는 아이폰 전용 (Mac은 목록 순서 그대로)
private struct HoldReorder: View {
    enum Phase { case began(CGPoint), moved(CGPoint), ended(CGPoint), cancelled }
    var minimumDuration: Double = 0.4
    var onPhase: (Phase) -> Void
    var body: some View { Color.clear }
}
#endif

private struct LibraryCardFrames: PreferenceKey {
    static var defaultValue: [UUID: CGRect] = [:]
    static func reduce(value: inout [UUID: CGRect], nextValue: () -> [UUID: CGRect]) {
        value.merge(nextValue(), uniquingKeysWith: { $1 })
    }
}

private enum Haptic {
    static func light() {
        #if os(iOS)
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        #endif
    }
    static func medium() {
        #if os(iOS)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        #endif
    }
}
