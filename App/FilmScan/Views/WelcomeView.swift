import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// 처음 켤 때 한 번: 구글로 시작하기 · 로그인 없이 쓰기 · 기록 불러오기 (웹·갤럭시와 같게, 예전 주소 옮기기는 웹에만).
/// 설정의 '구글로 로그인'에서 열면(loginOnly) 로그인 칸만 보인다
struct WelcomeView: View {
    var loginOnly = false
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @AppStorage("filmscan.welcomeSeen") private var welcomeSeen = false
    @AppStorage("filmscan.moveAsked") private var moveAsked = false
    @State private var step: String?
    @State private var result: String?
    @State private var error: String?
    @State private var showImport = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(spacing: 14) {
                        Image("AppIconImage").resizable().frame(width: 84, height: 84).clipShape(RoundedRectangle(cornerRadius: 20))
                        (Text("구글 계정으로 시작하면 기록과 사진이 ") + Text("내 구글 드라이브").bold() + Text("에 저장돼요.\n다른 기기에서 같은 계정으로 들어오면 그대로 이어져요."))
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .listRowBackground(Color.clear)
                }
                Section {
                    if let result {
                        Button { finish() } label: {
                            HStack { Text(result); Spacer(); Text(loginOnly ? "완료" : "시작").bold() }
                        }
                        .tint(Theme.safelight)
                    } else {
                        if let step {
                            HStack { Text(step).bold(); Spacer(); ProgressView() }
                        } else {
                            Button { start() } label: {
                                LabeledContent("처음이에요") { Text("구글로 시작하기").bold() }
                            }
                            .tint(Theme.safelight)
                            Button { start() } label: {
                                LabeledContent("계정이 있어요") { Text("구글로 로그인하기").bold() }
                            }
                            .tint(Theme.safelight)
                        }
                        if !loginOnly {
                            Button("로그인 없이 쓰기") { finish() }.disabled(step != nil)
                        }
                    }
                } footer: {
                    VStack(alignment: .leading, spacing: 6) {
                        if let error { Text(error).foregroundStyle(.red) }
                        Text(loginOnly ? "필름함 서버에는 아무것도 올라가지 않아요." : "필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.")
                    }
                }

                if result == nil && !loginOnly {
                    Section("기록 불러오기") {
                        Button("백업 파일 불러오기") { showImport = true }
                            .tint(Theme.safelight)
                            .disabled(step != nil)
                    }
                }
            }
            .navigationTitle(loginOnly ? "구글로 로그인" : "필름함 시작하기")
            .toolbar {
                if loginOnly {
                    ToolbarItem(placement: .cancellationAction) { Button("닫기") { finish() }.disabled(step != nil) }
                }
            }
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .fileImporter(isPresented: $showImport, allowedContentTypes: [.json]) { fileResult in
                guard case .success(let url) = fileResult else { return }
                let accessing = url.startAccessingSecurityScopedResource()
                defer { if accessing { url.stopAccessingSecurityScopedResource() } }
                step = "불러오는 중…"
                error = nil
                do {
                    let data = try Data(contentsOf: url)
                    let counts = try DataBackup.restore(data, into: context)
                    result = "카메라 \(counts.cameras)대, 롤 \(counts.rolls)개를 불러왔어요."
                } catch {
                    self.error = "백업 파일을 읽지 못했어요."
                }
                step = nil
            }
        }
        .interactiveDismissDisabled(step != nil)
        .onDisappear {
            welcomeSeen = true
            moveAsked = true
        }
    }

    private func finish() {
        welcomeSeen = true
        moveAsked = true
        dismiss()
    }

    private func start() {
        error = nil
        Task {
            do {
                step = "로그인 중…"
                try await GoogleAuth.signIn()
                step = "기록 받는 중…"
                let counts = try await DriveSync.pull(context, force: true)
                step = "올리는 중…"
                try await DriveSync.push(context, force: true)
                Task { await DrivePhotos.sync(context) }
                if let counts, counts.cameras + counts.rolls > 0 {
                    result = "카메라 \(counts.cameras)대, 롤 \(counts.rolls)개를 받았어요."
                } else {
                    result = "연결했어요. 이제 기록과 사진이 내 구글 드라이브에 저장돼요."
                }
            } catch {
                self.error = error.localizedDescription
            }
            step = nil
        }
    }
}
