import SwiftUI
import FilmScanCore

/// 밀착 인화지 미리보기. 여기서는 저장하지 않는다.
struct ContactSheetView: View {
    let roll: RollItem
    @Environment(\.dismiss) private var dismiss

    @State private var image: CGImage?
    @State private var showExport = false
    /// 보기 버튼을 누른 탭이 만들기 버튼에 닿지 않게, 잠시 뒤에 연다.
    @State private var canMake = false

    // 내보내기 설정 (미리보기에도 그대로 반영)
    @State private var useTitle = false
    @State private var title = ""
    @State private var includeInfo = true

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.paper.ignoresSafeArea()
                if let image {
                    ZoomableImage(image: image, maxScale: 10)
                } else {
                    ProgressView("펼치는 중…")
                }
            }
            .navigationTitle(roll.filmName)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
            }
            .safeAreaInset(edge: .bottom) {
                Button { showExport = true } label: {
                    Text("밀착 인화지로 만들기").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .tint(Theme.safelight)
                .disabled(image == nil || !canMake)
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 4)
                .background(Theme.paper)
            }
            .task {
                try? await Task.sleep(for: .milliseconds(500))
                canMake = true
            }
            .sheet(isPresented: $showExport) {
                ContactSheetExportView(roll: roll, image: image, useTitle: $useTitle, title: $title,
                                       includeInfo: $includeInfo)
                    #if os(iOS)
                    .presentationDetents([.medium, .large])
                    .presentationBackgroundInteraction(.enabled(upThrough: .medium))
                    #endif
            }
            // 제목/정보 설정이 바뀌면 미리보기를 다시 그린다
            .task(id: "\(useTitle)|\(title)|\(includeInfo)") {
                try? await Task.sleep(for: .milliseconds(image == nil ? 0 : 350))
                image = await ContactSheetBuilder.render(roll: roll, width: 4200,
                                                         title: useTitle ? title.nilIfBlank : nil,
                                                         includeInfo: includeInfo)
            }
            .onAppear {
                // 메모가 있으면 그걸 제목으로
                if let memo = roll.note?.nilIfBlank {
                    title = memo
                    useTitle = true
                }
            }
        }
        #if os(macOS)
        .frame(minWidth: 900, minHeight: 760)
        #endif
    }
}

/// 내보내기: 제목 넣기(선택), 촬영 정보 넣기, 사진 앱 저장 / 공유
private struct ContactSheetExportView: View {
    let roll: RollItem
    let image: CGImage?
    @Binding var useTitle: Bool
    @Binding var title: String
    @Binding var includeInfo: Bool

    @Environment(\.dismiss) private var dismiss
    @State private var fileURL: URL?
    @State private var saving = false
    @State private var armed = false
    @State private var message: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("제목 넣기", isOn: $useTitle)
                    if useTitle {
                        TextField("제목", text: $title)
                    }
                } footer: {
                    if roll.note?.nilIfBlank != nil {
                        Text("롤 메모로 제목을 채웠어요.")
                    }
                }
                Section {
                    Toggle("촬영 정보 넣기", isOn: $includeInfo)
                } footer: {
                    Text("필름, 카메라, 날짜, 장소, 현상소가 한 줄로 들어가요.")
                }
                Section {
                    Button {
                        Task { await saveToPhotos() }
                    } label: {
                        HStack {
                            Label("사진 앱에 저장", systemImage: "square.and.arrow.down")
                            if saving { Spacer(); ProgressView().controlSize(.small) }
                        }
                    }
                    .disabled(image == nil || saving || !armed)
                    if armed, let fileURL {
                        ShareLink(item: fileURL) { Label("공유…", systemImage: "square.and.arrow.up") }
                    } else if !armed {
                        Button("공유…", systemImage: "square.and.arrow.up") {}
                            .disabled(true)
                    } else {
                        HStack { ProgressView().controlSize(.small); Text("파일 준비 중…").foregroundStyle(.secondary) }
                    }
                } footer: {
                    if let message { Text(message) }
                }
            }
            .formStyle(.grouped)
            .navigationTitle("밀착 인화지로 만들기")
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
        #if os(macOS)
        .frame(minWidth: 420, minHeight: 420)
        #endif
    }

    private var fileName: String {
        let base = (useTitle ? title.nilIfBlank : nil) ?? roll.albumTitle
        return "\(base) 밀착.jpg".replacingOccurrences(of: "/", with: "-")
    }

    private func prepareFile() async {
        fileURL = nil
        guard let image else { return }
        let name = fileName
        fileURL = await Task.detached {
            guard let data = ImageEncoder.data(image, quality: 0.9) else { return nil }
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
            let data = await Task.detached { ImageEncoder.data(image, quality: 0.9) }.value
            guard let data else { return }
            try await PhotoLibrary.add(imageData: data, to: PhotoLibrary.existingAlbum(id: roll.albumIdentifier))
            message = "사진 앱 '\(roll.albumTitle)' 앨범에 저장했어요."
        } catch {
            message = error.localizedDescription
        }
    }
}
