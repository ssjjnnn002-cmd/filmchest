import SwiftUI
import SwiftData
import FilmScanCore

/// 스캔 한 장을 프레임으로 저장한다.
struct FramePrintView: View {
    let roll: RollItem
    @Environment(\.dismiss) private var dismiss
    @Query private var lenses: [LensItem]
    @AppStorage(AppSettings.Key.photographer, store: AppSettings.defaults) private var photographer = ""

    @State private var index = 0
    @State private var dark = false
    @State private var aspect: FrameAspect = .square
    @State private var showCamera = true
    @State private var showLens = true
    @State private var showFilm = true
    @State private var showFilter = true
    @State private var showDate = true
    @State private var showPhotographer = true
    @State private var showExposure = true
    @State private var image: CGImage?
    @State private var showExport = false
    @State private var editShot = false
    @State private var canMake = false

    private var frames: [FrameItem] { roll.sortedFrames }
    private var frame: FrameItem? { frames.indices.contains(index) ? frames[index] : nil }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(frames.enumerated()), id: \.element.persistentModelID) { i, item in
                            Button { index = i } label: {
                                frameThumb(item)
                                    .frame(width: 54, height: 54)
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                                    .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(index == i ? Theme.safelight : .clear, lineWidth: 2))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }
                ZStack {
                    (dark ? Color(red: 0.067, green: 0.067, blue: 0.067) : Theme.paper).ignoresSafeArea()
                    if let image {
                        Image(decorative: image, scale: 1).resizable().scaledToFit().padding(12)
                    } else {
                        ProgressView()
                    }
                }
            }
            .background(Theme.paper)
            .navigationTitle("프레임 만들기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
            }
            .safeAreaInset(edge: .bottom) { controls }
            .task {
                try? await Task.sleep(for: .milliseconds(500))
                canMake = true
            }
            .task(id: renderKey) { await render() }
            .sheet(isPresented: $editShot) {
                if let frame { FrameShotEditView(roll: roll, pos: frame.index - roll.meterOffset) }
            }
            .sheet(isPresented: $showExport) {
                FramePrintExportView(roll: roll, image: image)
                    #if os(iOS)
                    .presentationDetents([.medium, .large])
                    #endif
            }
        }
    }

    private var shot: MeterShot? { frame.flatMap { f in roll.meterShots.first { $0.pos + roll.meterOffset == f.index } } }

    private var renderKey: String {
        let s = shot
        return "\(index)|\(dark)|\(aspect.rawValue)|\(showCamera)|\(showLens)|\(showFilm)|\(showFilter)|\(showDate)|\(showPhotographer)|\(showExposure)|\(photographer)|\(s?.aperture ?? -1)|\(s?.shutter ?? -1)|\(s?.filters?.joined() ?? "")|\(roll.shotISO ?? 0)"
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker("바탕", selection: $dark) {
                Text("흰색").tag(false)
                Text("검정").tag(true)
            }
            .pickerStyle(.segmented)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(FrameAspect.allCases) { item in
                        Button { aspect = item } label: {
                            Text(item.title)
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .foregroundStyle(aspect == item ? Color.white : Color.primary)
                                .background(aspect == item ? Theme.safelight : Theme.card, in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(item == .square ? "정방형" : item.title)
                    }
                }
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    metaChip("카메라", on: $showCamera)
                    metaChip("렌즈", on: $showLens)
                    metaChip("필름", on: $showFilm)
                    metaChip("필터", on: $showFilter)
                    metaChip("날짜", on: $showDate)
                    metaChip("찍은 사람", on: $showPhotographer)
                    metaChip("노출", on: $showExposure)
                }
            }
            if showPhotographer {
                TextField("찍은 사람", text: $photographer)
                    .textFieldStyle(.roundedBorder)
            }
            HStack {
                Text(shotLine).font(.footnote).foregroundStyle(.secondary).lineLimit(2)
                Spacer(minLength: 8)
                Button(shot == nil ? "추가" : "수정") { editShot = true }
                    .font(.footnote.weight(.semibold))
            }
            Button { showExport = true } label: {
                Text("저장").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .tint(Theme.safelight)
            .disabled(image == nil || !canMake)
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 6)
        .background(Theme.paper)
    }

    private var shotLine: String {
        guard let shot else { return "이 컷 노출 기록 없음" }
        return [shot.exposureLine, shot.detailLine].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    private func metaChip(_ title: String, on: Binding<Bool>) -> some View {
        Button { on.wrappedValue.toggle() } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .foregroundStyle(on.wrappedValue ? Color.white : Color.primary)
                .background(on.wrappedValue ? Theme.safelight : Theme.card, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private func frameThumb(_ item: FrameItem) -> some View {
        Group {
            if let data = item.thumbnail, let ui = platformImage(data) {
                ui.resizable().scaledToFill()
            } else {
                Color.black.opacity(0.08)
            }
        }
    }

    private func render() async {
        guard let frame else { image = nil; return }
        let caption = makeCaption(for: frame)
        var cg: CGImage?
        if let id = frame.assetIdentifier {
            cg = await PhotoLibrary.image(assetID: id, maxPixel: 3200)
        }
        if cg == nil, let data = frame.thumbnail {
            cg = await Task.detached { ImageThumbnail.make(data: data, maxPixel: 2400) }.value
        }
        guard let cg else { image = nil; return }
        let ratio = aspect.ratio
        image = FramePrintRenderer.render(image: cg, caption: caption, ratio: ratio, pixelWidth: 2400)
    }

    private func makeCaption(for frame: FrameItem) -> FramePrintCaption {
        let n = frame.index
        let lensID = roll.lensID(at: n)
        let lensName = lenses.first { $0.id == lensID }?.displayName ?? roll.fixedLensLabel
        let shot = roll.meterShots.first { $0.pos + roll.meterOffset == n }
        let iso = roll.shotISO ?? roll.film?.iso
        let filter = shot?.filters?.filter { !$0.isEmpty }.joined(separator: ", ")
        return FramePrintCaption(
            dark: dark,
            camera: showCamera ? roll.cameraName : nil,
            lens: showLens ? lensName : nil,
            film: showFilm ? roll.film.map { FilmCanisterLabel.shortName($0) } ?? roll.filmName : nil,
            filter: showFilter ? filter.flatMap { $0.isEmpty ? nil : $0 } : nil,
            date: showDate ? Fmt.day.string(from: frame.takenAt ?? date(for: n)) : nil,
            photographer: showPhotographer ? photographer.nilIfBlank : nil,
            exposure: showExposure ? FrameCaptionFormat.exposure(aperture: shot?.aperture, shutter: shot?.shutter, iso: iso) : nil
        )
    }

    private func date(for frame: Int) -> Date {
        let days = roll.sortedDays
        let day = days.last { ($0.startFrame ?? 1) <= frame } ?? days.first
        return day?.startedAt ?? roll.loadedAt
    }
}

#if os(iOS)
import UIKit
private func platformImage(_ data: Data) -> Image? {
    guard let ui = UIImage(data: data) else { return nil }
    return Image(uiImage: ui)
}
#else
import AppKit
private func platformImage(_ data: Data) -> Image? {
    guard let ns = NSImage(data: data) else { return nil }
    return Image(nsImage: ns)
}
#endif

private struct FramePrintExportView: View {
    let roll: RollItem
    let image: CGImage?

    @Environment(\.dismiss) private var dismiss
    @State private var fileURL: URL?
    @State private var saving = false
    @State private var armed = false
    @State private var message: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Button {
                        Task { await saveToPhotos() }
                    } label: {
                        HStack {
                            Label("갤러리에 저장", systemImage: "square.and.arrow.down")
                            if saving { Spacer(); ProgressView().controlSize(.small) }
                        }
                    }
                    .disabled(image == nil || saving || !armed)
                    if armed, let fileURL {
                        ShareLink(item: fileURL) { Label("파일로 저장", systemImage: "square.and.arrow.up") }
                    } else {
                        Button("파일로 저장", systemImage: "square.and.arrow.up") {}
                            .disabled(true)
                    }
                } footer: {
                    if let message { Text(message) }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("프레임 만들기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } }
            }
            .task(id: image.map { ObjectIdentifier($0) }) { await prepareFile() }
            .task {
                try? await Task.sleep(for: .milliseconds(500))
                armed = true
            }
        }
    }

    private var fileName: String {
        "\(roll.albumTitle) 프레임.jpg".replacingOccurrences(of: "/", with: "-")
    }

    private func prepareFile() async {
        fileURL = nil
        guard let image else { return }
        let name = fileName
        fileURL = await Task.detached {
            guard let data = ImageEncoder.data(image, quality: 0.92) else { return nil }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
            try? data.write(to: url)
            return url
        }.value
    }

    private func saveToPhotos() async {
        guard let image else { return }
        saving = true
        defer { saving = false }
        do {
            try await PhotoLibrary.requestAccess()
            let data = await Task.detached { ImageEncoder.data(image, quality: 0.92) }.value
            guard let data else { return }
            try await PhotoLibrary.add(imageData: data, to: PhotoLibrary.existingAlbum(id: roll.albumIdentifier))
            message = "갤러리에 저장했어요"
        } catch {
            message = "저장하지 못했어요"
        }
    }
}
