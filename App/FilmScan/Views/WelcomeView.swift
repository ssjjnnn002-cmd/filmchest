import SwiftUI
import SwiftData

/// 처음 켤 때 한 번: 구글로 시작하기 (내 구글 드라이브에 기록·사진 저장) 또는 로그인 없이 쓰기 (웹·갤럭시와 같게)
struct WelcomeView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @AppStorage("filmscan.welcomeSeen") private var welcomeSeen = false
    @State private var step: String?
    @State private var result: String?
    @State private var error: String?

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
                            HStack { Text(result); Spacer(); Text("시작").bold() }
                        }
                        .tint(Theme.safelight)
                    } else {
                        Button { start() } label: {
                            HStack {
                                Text(step ?? "구글로 시작하기").bold()
                                if step != nil { Spacer(); ProgressView() }
                            }
                        }
                        .tint(Theme.safelight)
                        .disabled(step != nil)
                        Button("로그인 없이 쓰기") { finish() }.disabled(step != nil)
                    }
                } footer: {
                    VStack(alignment: .leading, spacing: 6) {
                        if let error { Text(error).foregroundStyle(.red) }
                        Text("필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.")
                    }
                }
            }
            .navigationTitle("필름함 시작하기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
        }
        .interactiveDismissDisabled(step != nil)
        .onDisappear { welcomeSeen = true }
    }

    private func finish() { welcomeSeen = true; dismiss() }

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
