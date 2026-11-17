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
    /// 로그아웃한 뒤: 기록은 기기에 남아 있다. 같은 계정이면 그대로 이어지고, 다른 계정·로그인 없이 쓰기는 지울지 묻는다 (웹·갤럭시와 같음)
    private var kept: String? { loginOnly ? nil : DriveSync.keptAccount }
    @State private var ask: Ask?
    struct Ask: Identifiable { let id = UUID(); let message: String; let resolve: (Bool) -> Void }
    private func askOnce(_ message: String) async -> Bool {
        await withCheckedContinuation { cont in ask = Ask(message: message) { cont.resume(returning: $0) } }
    }

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
                            Button("로그인 없이 쓰기") {
                                guard let kept else { finish(); return }
                                Task {
                                    if await askOnce("이 기기에 남은 \(kept) 계정 기록을 지우고 로그인 없이 새로 시작할까요? 기록은 그 계정 드라이브에 있어요.") {
                                        try? DriveSync.wipeDevice(context)
                                        finish()
                                    }
                                }
                            }.disabled(step != nil)
                        }
                    }
                } footer: {
                    VStack(alignment: .leading, spacing: 6) {
                        if let error { Text(error).foregroundStyle(.red) }
                        if let kept, result == nil { Text("로그아웃했어요. \(kept) 계정으로 다시 로그인하면 바뀐 것만 받아서 바로 이어져요.") }
                        Text(loginOnly ? "필름함 서버에는 아무것도 올라가지 않아요." : "필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.")
                    }
                }

                if result == nil && !loginOnly && kept == nil {
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
        .interactiveDismissDisabled(step != nil || (kept != nil && result == nil))
        .alert(ask?.message ?? "", isPresented: Binding(get: { ask != nil }, set: { if !$0 { ask?.resolve(false); ask = nil } })) {
            Button("취소", role: .cancel) { ask?.resolve(false); ask = nil }
            Button("지우고 시작", role: .destructive) { ask?.resolve(true); ask = nil }
        }
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
                if let kept {
                    if let now = GoogleAuth.account, now != kept {
                        guard await askOnce("이 기기에는 \(kept) 계정 기록이 남아 있어요. 지우고 \(now)(으)로 시작할까요? \(kept) 기록은 그 계정 드라이브에 있어요.") else {
                            GoogleAuth.signOut()
                            throw DriveError.message("로그인을 취소했어요. 기록은 그대로 있어요.")
                        }
                        step = "이 기기 기록 지우는 중…"
                        try DriveSync.wipeForNewAccount(context)
                    }
                    UserDefaults.standard.removeObject(forKey: DriveSync.keptKey)
                }
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
