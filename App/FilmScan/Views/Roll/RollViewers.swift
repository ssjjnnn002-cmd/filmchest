import SwiftUI
import FilmScanCore

/// 컷 하나씩 보기: 좌우로 넘기기, 확대, 하트(사진 앱 즐겨찾기와 연동)
struct FrameViewer: View {
    let roll: RollItem
    @State var index: Int
    @State private var editShot = false
    @Environment(\.dismiss) private var dismiss

    private var frames: [FrameItem] { roll.sortedFrames }
    private var current: FrameItem? { frames.indices.contains(index) ? frames[index] : nil }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                pages
                infoBar
            }
            .background(Color.black)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
                ToolbarItem(placement: .principal) {
                    Text("\(index + 1) / \(frames.count)").font(.headline.monospacedDigit()).foregroundStyle(.white)
                }
                ToolbarItem(placement: .primaryAction) {
                    if let frame = current {
                        let isCover = roll.coverFrame?.index == frame.index
                        Menu {
                            Button(isCover ? "대표 사진" : "대표 사진으로 지정", systemImage: isCover ? "checkmark" : "photo") {
                                roll.coverFrameIndex = frame.index
                            }
                            .disabled(isCover)
                        } label: {
                            Image(systemName: "ellipsis").foregroundStyle(.white)
                        }
                        .accessibilityLabel("더 보기")
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if let frame = current {
                        Button {
                            toggleFavorite(frame)
                        } label: {
                            Image(systemName: frame.isFavorite ? "heart.fill" : "heart")
                                .foregroundStyle(frame.isFavorite ? Theme.safelight : .white)
                        }
                        .accessibilityLabel(frame.isFavorite ? "즐겨찾기 해제" : "즐겨찾기")
                    }
                }
            }
            #if os(iOS)
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            #endif
        }
        // 돌린 사진은 닫을 때 사진 앱에도 한꺼번에 반영한다 (허락 창이 한 번만 뜨게)
        .onDisappear { syncRotationsToPhotos() }
        .sheet(isPresented: $editShot) {
            if let frame = current { FrameShotEditView(roll: roll, pos: frame.index - roll.meterOffset) }
        }
        #if os(macOS)
        .frame(minWidth: 860, minHeight: 680)
        .onKeyPress(.leftArrow) { step(-1); return .handled }
        .onKeyPress(.rightArrow) { step(1); return .handled }
        #endif
    }

    @ViewBuilder
    private var pages: some View {
        #if os(iOS)
        TabView(selection: $index) {
            ForEach(Array(frames.enumerated()), id: \.offset) { i, frame in
                FramePage(frame: frame).tag(i)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        #else
        ZStack {
            if let frame = current { FramePage(frame: frame).id(frame.index) }
            HStack {
                Button { step(-1) } label: { Image(systemName: "chevron.left.circle.fill").font(.largeTitle) }
                    .disabled(index == 0)
                Spacer()
                Button { step(1) } label: { Image(systemName: "chevron.right.circle.fill").font(.largeTitle) }
                    .disabled(index >= frames.count - 1)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.white.opacity(0.8))
            .padding()
        }
        #endif
    }

    private var infoBar: some View {
        VStack(spacing: 4) {
            if let f = current {
                if let shot = roll.meterShots.first(where: { $0.pos + roll.meterOffset == f.index }) {
                    Text(shot.exposureLine).font(.subheadline.weight(.semibold))
                    let notes = [shot.focal.map { "\($0)mm" }, shot.filters?.joined(separator: ", "), shot.tags?.joined(separator: ", "), shot.memo]
                        .compactMap { $0 }.filter { !$0.isEmpty }
                    if !notes.isEmpty {
                        Text(notes.joined(separator: " · ")).foregroundStyle(.white.opacity(0.75))
                    }
                }
                Button(roll.meterShots.contains { $0.pos + roll.meterOffset == f.index } ? "촬영 정보" : "촬영 정보 추가") { editShot = true }
                    .font(.footnote.weight(.semibold))
                    .buttonStyle(.plain)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.14), in: Capsule())
                    .padding(.top, 2)
                HStack(spacing: 28) {
                    Button { rotate(f, by: -1) } label: { Image(systemName: "rotate.left").font(.title3) }
                        .accessibilityLabel("왼쪽으로 돌리기")
                    Button { rotate(f, by: 1) } label: { Image(systemName: "rotate.right").font(.title3) }
                        .accessibilityLabel("오른쪽으로 돌리기")
                }
                .buttonStyle(.plain)
                .padding(.vertical, 4)
                HStack(spacing: 10) {
                    if let t = f.takenAt { Text(Fmt.dayTime.string(from: t)) }
                    if let p = f.locationName, !p.isEmpty { Label(p, systemImage: "mappin") }
                }
                HStack(spacing: 10) {
                    if let r = Resolution.text(width: f.pixelWidth, height: f.pixelHeight) { Text(r) }
                    if let b = Resolution.bytes(f.byteSize) { Text(b) }
                }
                .foregroundStyle(.white.opacity(0.6))
            }
        }
        .font(.footnote)
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.black)
    }

    private func step(_ d: Int) {
        index = min(max(index + d, 0), frames.count - 1)
    }

    private func rotate(_ frame: FrameItem, by d: Int) {
        frame.rotation = ((frame.turns + d) % 4 + 4) % 4
    }

    private func syncRotationsToPhotos() {
        let changed = frames.filter { $0.assetIdentifier != nil && $0.turns != (($0.photoRotation ?? 0) % 4 + 4) % 4 }
        guard !changed.isEmpty else { return }
        let items = changed.map { (assetID: $0.assetIdentifier!, turns: $0.turns) }
        Task { @MainActor in
            let done = Set(await PhotoLibrary.setRotation(items))
            for f in changed where done.contains(f.assetIdentifier!) { f.photoRotation = f.turns }
        }
    }

    private func toggleFavorite(_ frame: FrameItem) {
        frame.isFavorite.toggle()
        if let id = frame.assetIdentifier {
            let value = frame.isFavorite
            Task { await PhotoLibrary.setFavorite(assetID: id, value) }
        }
    }
}

/// 한 장: 먼저 미리보기, 이어서 사진 앱 원본을 크게 불러와 확대할 수 있게
private struct FramePage: View {
    let frame: FrameItem
    @State private var thumb: CGImage?
    @State private var full: CGImage?
    @State private var image: CGImage?
    @State private var loadingFull = true

    var body: some View {
        ZStack {
            if let image {
                ZoomableImage(image: image).id(frame.turns)
            } else {
                ProgressView().tint(.white)
            }
            if loadingFull && image != nil {
                VStack {
                    Spacer()
                    ProgressView().controlSize(.small).tint(.white).padding(.bottom, 8)
                }
            }
        }
        .task {
            if let data = frame.thumbnail {
                thumb = await Task.detached { ImageThumbnail.make(data: data, maxPixel: 1200) }.value
                show()
            }
            if let id = frame.assetIdentifier, let big = await PhotoLibrary.image(assetID: id, maxPixel: 3200) {
                full = big
                show()
            }
            loadingFull = false
        }
        .onChange(of: frame.turns) { show() }
    }

    /// 돌린 방향을 바로 반영한다. 사진 앱 이미지는 이미 반영된 만큼 빼고 돌린다
    private func show() {
        if let full { image = full.rotated(quarterTurns: frame.turnsFromPhoto) }
        else if let thumb { image = thumb.rotated(quarterTurns: frame.turns) }
    }
}

/// 롤 정보로 밀착 인화 이미지를 만든다 (전체 보기와 밀착 인화 저장이 같이 쓴다)
enum ContactSheetBuilder {
    static func header(for roll: RollItem) -> String {
        var parts = [roll.filmName + (roll.shotISO.map { " @ \($0)" } ?? "")]
        if let name = roll.cameraLabel {
            parts.append([name, roll.lens?.model ?? roll.fixedLensLabel].compactMap { $0 }.joined(separator: " + "))
        }
        parts.append(roll.dateRangeText)
        let places = roll.sortedLocations.map(\.name).filter { !$0.isEmpty }
        if !places.isEmpty { parts.append(places.joined(separator: ", ")) }
        if let lab = roll.labName { parts.append(lab) }
        return parts.joined(separator: "  ·  ")
    }

    @MainActor
    static func render(roll: RollItem, width: Int, title: String? = nil, includeInfo: Bool = true) async -> CGImage? {
        let thumbs = roll.sortedFrames.map(\.thumbnail)
        let format = roll.format
        let film = roll.film
        let header = includeInfo ? header(for: roll) : nil
        return await Task.detached(priority: .userInitiated) {
            ContactSheetRenderer.render(frameCount: thumbs.count, format: format, film: film,
                                        options: .init(pixelWidth: width, header: header, title: title),
                                        image: { i, max in thumbs[i].flatMap { ImageThumbnail.make(data: $0, maxPixel: max) } })
        }.value
    }
}
