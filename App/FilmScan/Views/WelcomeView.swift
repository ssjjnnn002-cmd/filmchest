import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// 처음 켤 때 한 번: 구글로 시작하기 + 예전 서버 기록 옮기기 (웹·갤럭시와 같게)
struct WelcomeView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @AppStorage("filmscan.welcomeSeen") private var welcomeSeen = false
    @AppStorage("filmscan.moveAsked") private var moveAsked = false
    @State private var step: String?
    @State private var result: String?
    @State private var error: String?
    @State private var note: String?
    @State private var showImport = false
    @State private var showGuide = false

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
                        Button("로그인 없이 쓰기") { finish() }.disabled(step != nil)
                    }
                } footer: {
                    VStack(alignment: .leading, spacing: 6) {
                        if let error { Text(error).foregroundStyle(.red) }
                        Text("필름함 서버에는 아무것도 올라가지 않아요. 나중에 설정에서도 로그인할 수 있어요.")
                    }
                }

                if result == nil {
                    Section {
                        Button("구글 드라이브에서 불러오기") { fromDrive() }
                            .tint(Theme.safelight)
                            .disabled(step != nil)
                        Button("백업 파일 불러오기") { showImport = true }
                            .tint(Theme.safelight)
                            .disabled(step != nil)
                        Button("예전 서버에서 바로 불러오기") { showGuide = true }
                            .tint(Theme.safelight)
                            .disabled(step != nil)
                        Button("처음 써요") { finish() }
                            .disabled(step != nil)
                    } header: {
                        Text("예전 기록 불러오기")
                    } footer: {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("필름함 주소가 filmchest.vercel.app에서 filmchest.pages.dev로 변경되었습니다. 서버 사용량 한도 초과로 예전 주소는 11월 30일까지 일시 중단된 상태입니다. 이용에 불편을 드려 죄송합니다.")
                            if let note { Text(note) }
                        }
                    }
                    Section {
                        Text("위의 ‘예전 서버에서 바로 불러오기’를 눌러 안내에 따라 진행해 주세요. 기록과 사진이 새 주소로 그대로 옮겨집니다. 11월 30일 이후에는 예전 주소(filmchest.vercel.app)에 접속해 ‘기록 옮기고 새 주소로 가기’ 버튼만 눌러도 됩니다.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Text("기록은 예전 주소를 사용하던 브라우저 안에만 저장되어 있습니다. 옮기기 전까지 해당 브라우저의 방문 기록, 쿠키, 사이트 데이터를 삭제하지 마세요. 삭제하면 복구할 수 없습니다.")
                            .font(.footnote)
                            .foregroundStyle(.red)
                    } header: {
                        Text("백업 파일이 없는 경우")
                    }
                }
            }
            .navigationTitle("필름함 시작하기")
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
                    note = "백업 파일을 읽지 못했어요."
                }
                step = nil
            }
            .sheet(isPresented: $showGuide) {
                MoveGuideSheet()
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

    /// 올리기 없이 받기만 (빈 기록으로 드라이브를 덮지 않음)
    private func fromDrive() {
        error = nil
        Task {
            do {
                step = "로그인 중…"
                try await GoogleAuth.signIn()
                step = "불러오는 중…"
                if let counts = try await DriveSync.pull(context, force: true), counts.cameras + counts.rolls > 0 {
                    result = "카메라 \(counts.cameras)대, 롤 \(counts.rolls)개를 불러왔어요."
                } else {
                    result = "드라이브에 기록 파일이 아직 없어요. 구글로 로그인해 이어갈 수 있어요."
                }
            } catch {
                note = error.localizedDescription
            }
            step = nil
        }
    }
}

/// 예전 vercel이 중단돼도 브라우저 저장소를 북마크로 꺼내는 안내 (웹에서 진행)
private struct MoveGuideSheet: View {
    @Environment(\.dismiss) private var dismiss
    private let oldSite = URL(string: "https://filmchest.vercel.app")!
    private let newSite = URL(string: "https://filmchest.pages.dev")!
    private let steps = [
        "아래 ‘새 주소(웹) 열기’로 사파리에서 필름함 웹을 열어요.",
        "웹 시작 화면에서 ‘예전 서버에서 바로 불러오기’ → ‘코드 복사’로 북마크를 만들어요.",
        "‘예전 주소 열기’를 눌러요. 서버 오류 화면이 떠도 그대로 두세요.",
        "그 화면에서 북마크 ‘필름함 옮기기’ → ‘기록 옮기기’를 눌러요.",
    ]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(Array(steps.enumerated()), id: \.offset) { i, text in
                        Text("\(i + 1). \(text)")
                    }
                } footer: {
                    Text("예전 주소(filmchest.vercel.app) 서버는 사용량 초과로 지금은 열리지 않아요. 기록은 서버가 아니라 예전에 쓰던 브라우저 안에 남아 있어서, 웹 북마크로 그 브라우저에서 바로 꺼낼 수 있어요.")
                }
                Section {
                    Link("새 주소(웹) 열기", destination: newSite)
                    Link("예전 주소 열기", destination: oldSite)
                } footer: {
                    Text("반드시 예전에 필름함 웹을 쓰던 같은 브라우저에서 해 주세요. 앱만 쓰던 기록은 구글 드라이브나 백업 파일로 가져오면 돼요.")
                }
            }
            .navigationTitle("예전 서버에서 바로 불러오기")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("완료") { dismiss() }
                }
            }
        }
    }
}
