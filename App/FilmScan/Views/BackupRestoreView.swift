import SwiftUI
import SwiftData
import PhotosUI

/// 백업 및 복구: 클라우드 백업, 백업 파일, 사진으로 롤 복구를 한 화면에
struct BackupRestoreView: View {
    @Environment(\.modelContext) private var context
    @State private var gearDoc = GearDocument(data: Data())
    @State private var showExport = false
    @State private var showImport = false
    @State private var restoreItems: [PhotosPickerItem] = []
    @State private var note: String?

    var body: some View {
        Form {
        Section {
            NavigationLink {
                CloudBackupView()
            } label: {
                LabeledContent("클라우드 백업", value: AutoBackup.folderName == nil ? "연결 안 됨" : "연결됨 · \(AutoBackup.cloudName ?? "폴더")")
            }
            Button("백업 파일로 저장") {
                if let data = try? DataBackup.data(from: context) {
                    gearDoc = GearDocument(data: data)
                    showExport = true
                }
            }
            Button("백업 불러오기") { showImport = true }
        } header: {
            Text("백업")
        } footer: {
            Text("장비·필름·롤 기록을 파일 하나로 저장해요. 스캔 사진은 빠져요.")
        }

        Section {
            Button("사진 앱에서 롤 복구") {
                Task {
                    do {
                        let result = try await PhotoRestore.restoreAppAlbums(context: context)
                        note = result.frames == 0
                            ? "필름함 앨범에서 표식이 있는 사진을 찾지 못했어요. 웹앱·갤럭시에서 저장한 사진은 '사진 직접 고르기'로 골라 주세요."
                            : "롤 \(result.rolls)개, 사진 \(result.frames)장을 가져왔어요."
                    } catch {
                        note = error.localizedDescription
                    }
                }
            }
            PhotosPicker(selection: $restoreItems, matching: .images, preferredItemEncoding: .current, photoLibrary: .shared()) {
                Text("사진 직접 고르기")
            }
        } header: {
            Text("사진으로 롤 복구")
        } footer: {
            Text("이 앱(아이폰·웹·갤럭시)이 저장한 사진의 표식으로 롤을 다시 묶어요. 웹앱에서 저장한 사진은 필름함 앨범에 없으니 직접 골라 주세요. 클라우드 백업을 먼저 복구하면 필름·카메라 정보까지 함께 돌아와요.")
        }
        }
        .formStyle(.grouped)
    .fileExporter(isPresented: $showExport, document: gearDoc, contentType: .json, defaultFilename: DataBackup.fileName) { _ in }
    .fileImporter(isPresented: $showImport, allowedContentTypes: [.json]) { result in
        guard case .success(let url) = result else { return }
        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }
        do {
            let data = try Data(contentsOf: url)
            let counts = try DataBackup.restore(data, into: context)
            note = "카메라 \(counts.cameras)대, 롤 \(counts.rolls)개를 불러왔어요."
        } catch {
            note = "백업 파일을 읽지 못했어요."
        }
    }
    .onChange(of: restoreItems) { _, items in
        Task {
            var rolls = 0
            var frames = 0
            for item in items {
                guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
                let result = PhotoRestore.restore(data: data, assetID: item.itemIdentifier, context: context)
                rolls += result.rolls
                frames += result.frames
            }
            restoreItems = []
            note = frames == 0 ? "이 앱이 남긴 표식이 없는 사진이에요." : "롤 \(rolls)개, 사진 \(frames)장을 가져왔어요."
        }
    }
        .alert("복구", isPresented: Binding(get: { note != nil }, set: { if !$0 { note = nil } })) {
            Button("확인", role: .cancel) { note = nil }
        } message: {
            Text(note ?? "")
        }
        .navigationTitle("백업 및 복구")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}
