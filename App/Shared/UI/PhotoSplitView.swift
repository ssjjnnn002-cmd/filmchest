import SwiftUI
import FilmScanCore

/// 사진 앱에서 여러 장을 공유받았을 때: 몇 롤인지 고르고, 사진을 롤마다 나눈 뒤
/// 롤 하나씩 기존 롤 가져오기로 넘긴다.
/// 나눌 사진 한 장: 사진 앱 사진(연결) 또는 파일
struct SplitPhoto: Hashable, Identifiable {
    var assetID: String?
    var url: URL?
    var id: String { assetID ?? url?.path ?? UUID().uuidString }
}

struct PhotoImportFlow: View {
    let photos: [SplitPhoto]
    /// 사진 앱에서 찾지 못해 빠진 장 수
    var missing = 0
    var onClose: () -> Void
    var onSaved: ((RollItem) -> Void)? = nil

    @State private var sets: [[SplitPhoto]]?
    @State private var step = 0

    var body: some View {
        if let sets, sets.indices.contains(step) {
            let set = sets[step]
            ArchiveImportView(presetFiles: set.compactMap { $0.assetID == nil ? $0.url : nil },
                              presetAssetIDs: set.compactMap(\.assetID),
                              stepTitle: sets.count > 1 ? "\(step + 1) / \(sets.count)" : nil,
                              onFinished: {
                                  if step + 1 < sets.count { step += 1 } else { onClose() }
                              })
            .id(step)
        } else {
            PhotoSplitView(photos: photos, missing: missing, onCancel: onClose) { sets = $0; step = 0 }
        }
    }
}

/// 사진을 롤마다 나눈다. 롤 수를 정하고, 위에서 롤을 고른 뒤 사진을 누르면 그 롤로 옮긴다.
struct PhotoSplitView: View {
    let photos: [SplitPhoto]
    var missing = 0
    var onCancel: () -> Void
    var onDone: ([[SplitPhoto]]) -> Void

    @State private var rollCount = 1
    @State private var assign: [Int]
    @State private var active = 0
    @State private var thumbs: [String: CGImage] = [:]

    init(photos: [SplitPhoto], missing: Int = 0, onCancel: @escaping () -> Void, onDone: @escaping ([[SplitPhoto]]) -> Void) {
        self.photos = photos
        self.missing = missing
        self.onCancel = onCancel
        self.onDone = onDone
        _assign = State(initialValue: Array(repeating: 0, count: photos.count))
    }

    private static let colors: [Color] = [Theme.safelight, .blue, .green, .purple, .orange, .teal, .pink, .brown, .indigo, .mint]
    private func color(_ i: Int) -> Color { Self.colors[i % Self.colors.count] }
    private var sets: [[SplitPhoto]] { (0..<rollCount).map { r in photos.indices.filter { assign[$0] == r }.map { photos[$0] } } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if missing > 0 {
                        Label("\(missing)장은 사진 앱에서 찾지 못해 빠졌어요", systemImage: "exclamationmark.triangle")
                            .font(.footnote).foregroundStyle(.orange)
                    }
                    Stepper(value: $rollCount, in: 1...max(1, min(photos.count, 20))) {
                        Text("롤 수 · \(rollCount)롤").font(.headline)
                    }
                    .onChange(of: rollCount) { _, n in spread(n) }
                    if rollCount > 1 {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(0..<rollCount, id: \.self) { r in
                                    Button { active = r } label: {
                                        Text("\(r + 1)롤 · \(sets[r].count)장")
                                            .font(.subheadline.weight(.semibold))
                                            .padding(.horizontal, 12).padding(.vertical, 7)
                                            .foregroundStyle(active == r ? .white : color(r))
                                            .background(active == r ? color(r) : color(r).opacity(0.14), in: Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        Text("롤을 고른 뒤 사진을 누르면 그 롤로 옮겨요. 길게 누르면 그 사진부터 끝까지 옮겨요.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 92), spacing: 6)], spacing: 6) {
                        ForEach(photos.indices, id: \.self) { i in
                            cell(i)
                        }
                    }
                }
                .padding(16)
            }
            .background(Theme.paper)
            .navigationTitle("사진 \(photos.count)장")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기", action: onCancel) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("다음") { onDone(sets.filter { !$0.isEmpty }) }
                        .disabled(sets.allSatisfy(\.isEmpty))
                }
            }
        }
    }

    private func cell(_ i: Int) -> some View {
        let photo = photos[i]
        return ZStack(alignment: .topLeading) {
            Color.black.opacity(0.08)
                .overlay {
                    if let img = thumbs[photo.id] { Image(decorative: img, scale: 1).resizable().scaledToFill() }
                }
                .clipped()
            if rollCount > 1 {
                Text("\(assign[i] + 1)")
                    .font(.caption.weight(.bold)).foregroundStyle(.white)
                    .frame(width: 22, height: 22).background(color(assign[i]), in: Circle())
                    .padding(5)
            }
        }
        .frame(height: 92)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(rollCount > 1 ? color(assign[i]) : .clear, lineWidth: 2))
        .contentShape(Rectangle())
        .onTapGesture { if rollCount > 1 { assign[i] = active } }
        .onLongPressGesture { if rollCount > 1 { for k in i..<photos.count { assign[k] = active } } }
        .task(id: photo.id) {
            guard thumbs[photo.id] == nil else { return }
            if let id = photo.assetID {
                thumbs[photo.id] = await PhotoLibrary.image(assetID: id, maxPixel: 240)
            } else if let url = photo.url {
                thumbs[photo.id] = await Task.detached { ImageThumbnail.make(url: url, maxPixel: 240) }.value
            }
        }
    }

    /// 롤 수를 바꾸면 순서대로 고르게 나눠 둔다 (그다음 직접 고친다)
    private func spread(_ n: Int) {
        let per = Double(photos.count) / Double(max(n, 1))
        assign = photos.indices.map { min(n - 1, Int(Double($0) / per)) }
        active = min(active, n - 1)
    }
}
