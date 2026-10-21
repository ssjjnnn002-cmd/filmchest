import SwiftUI
import SwiftData
import UniformTypeIdentifiers

/// 클라우드 백업: 어느 클라우드에 둘지 고르고, 연결 상태와 연결 확인
struct CloudBackupView: View {
    @Environment(\.modelContext) private var context
    @AppStorage(AutoBackup.intervalKey) private var backupDays = 1
    @State private var picking = false
    @State private var pendingCloud: String?
    @State private var message: (text: String, ok: Bool)?
    @State private var revision = 0
    @State private var confirmDisconnect = false
    @State private var confirmRestore = false

    private let clouds: [(name: String, symbol: String, help: String)] = [
        ("구글 드라이브", "externaldrive.connected.to.line.below", "구글 드라이브 앱을 설치하고 로그인해 두세요. 고르는 창의 위치 목록에 Google Drive가 없으면 ⋯ 를 눌러 켜면 돼요."),
        ("iCloud Drive", "icloud", "iPhone 설정 > 내 이름 > iCloud에서 iCloud Drive가 켜져 있어야 해요."),
        ("OneDrive", "cloud", "OneDrive 앱을 설치하고 로그인해 두세요."),
        ("Dropbox", "shippingbox", "Dropbox 앱을 설치하고 로그인해 두세요."),
        ("다른 위치", "folder", "파일 앱에 보이는 어느 폴더든 고를 수 있어요."),
    ]

    private func driveRun(_ ok: String?, _ work: @escaping () async throws -> Void) {
        Task {
            do {
                try await work()
                if let ok { message = (ok, true) }
            } catch {
                message = (error.localizedDescription, false)
            }
            revision += 1
        }
    }

    var body: some View {
        let _ = revision
        let connected = AutoBackup.folderName != nil
        Form {
            Section {
                if GoogleAuth.isConnected {
                    LabeledContent("연결됨", value: GoogleAuth.account ?? "구글 드라이브")
                    if let last = DriveSync.lastSync {
                        LabeledContent("마지막으로 맞춤", value: last.formatted(date: .abbreviated, time: .shortened))
                    }
                    Button("지금 올리기", systemImage: "arrow.up.doc") {
                        driveRun("드라이브에 올렸어요. 연결돼 있어요.") { try await DriveSync.push(context, force: true) }
                    }
                    Button("드라이브에서 장비·기록 복구 (최신 파일)", systemImage: "arrow.down.doc") {
                        driveRun(nil) {
                            if let c = try await DriveSync.pull(context, force: true) {
                                message = ("카메라 \(c.cameras)대, 롤 \(c.rolls)개를 맞췄어요.", true)
                            } else { message = ("드라이브에 백업 파일이 아직 없어요.", false) }
                        }
                    }
                    Button("드라이브에서 백업 폴더 열기", systemImage: "folder") {
                        #if os(iOS)
                        UIApplication.shared.open(DriveClient.folderURL)
                        #endif
                    }
                    Button("연결 끊기", role: .destructive) { GoogleAuth.signOut(); revision += 1 }
                } else {
                    Button("구글 드라이브 연결", systemImage: "person.crop.circle.badge.checkmark") {
                        driveRun("구글 드라이브에 연결했어요. 웹·갤럭시와 같은 기록을 써요.") {
                            try await GoogleAuth.signIn()
                            _ = try await DriveSync.pull(context, force: true)
                            try await DriveSync.push(context, force: true)
                        }
                    }
                }
            } header: {
                Text("구글 드라이브 (웹·갤럭시와 함께)")
            } footer: {
                Text("구글 계정으로 연결하면 드라이브의 '필름함' 폴더에 장비·필름·롤 기록을 올리고, 웹앱·갤럭시와 같은 파일을 함께 써요. 앱을 열 때 다른 기기에서 고친 기록을 합치고, 나갈 때 바뀐 기록을 올려요. 사진은 올리지 않아요.")
            }

            Section {
                HStack(spacing: 12) {
                    Image(systemName: connected ? "checkmark.icloud.fill" : "icloud.slash")
                        .font(.title2)
                        .foregroundStyle(connected ? Theme.safelight : .secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(connected ? "연결됨 · \(AutoBackup.cloudName ?? "폴더")" : "연결 안 됨").font(.headline)
                        if let folder = AutoBackup.folderName { Text("폴더: \(folder)").font(.caption).foregroundStyle(.secondary) }
                        if let last = AutoBackup.lastBackup {
                            Text("마지막 백업 \(last.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(.vertical, 4)
                if AutoBackup.isLocalOnly {
                    Label("이 iPhone 안 폴더예요. 클라우드로 올라가지 않아요.", systemImage: "exclamationmark.triangle")
                        .font(.footnote).foregroundStyle(.orange)
                }
                if let message {
                    Label(message.text, systemImage: message.ok ? "checkmark.circle.fill" : "xmark.octagon.fill")
                        .font(.footnote)
                        .foregroundStyle(message.ok ? .green : .red)
                }
                if connected {
                    Button("연결 확인", systemImage: "checkmark.shield") {
                        if let failure = AutoBackup.verify() {
                            message = (failure, false)
                        } else {
                            message = ("\(AutoBackup.cloudName ?? "폴더")에 저장하고 다시 읽었어요. 연결돼 있어요.", true)
                        }
                        revision += 1
                    }
                    Button("지금 백업", systemImage: "arrow.up.doc") {
                        do {
                            try AutoBackup.run(context, force: true)
                            message = ("'\(DataBackup.fileName)'을 올렸어요.", true)
                        } catch {
                            message = ("백업하지 못했어요. 연결 확인을 눌러 보세요.", false)
                        }
                        revision += 1
                    }
                    #if os(iOS)
                    if let open = AutoBackup.folderOpenURL {
                        Button("백업 폴더 열기", systemImage: "folder") { UIApplication.shared.open(open) }
                    }
                    #endif
                    Button("클라우드 백업에서 복구", systemImage: "arrow.down.doc") { confirmRestore = true }
                    Picker("자동 백업", selection: $backupDays) {
                        Text("끔").tag(0)
                        Text("매일").tag(1)
                        Text("매주").tag(7)
                    }
                }
            } header: {
                Text("파일 앱 폴더")
            } footer: {
                Text("앱을 닫을 때(홈 화면으로 나갈 때) 정한 주기가 지났고 바뀐 기록이 있으면 '\(DataBackup.fileName)' 하나에 덮어써요. 스캔 사진은 빠져요.")
            }

            Section {
                ForEach(clouds, id: \.name) { cloud in
                    Button {
                        pendingCloud = cloud.name
                        picking = true
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: cloud.symbol).frame(width: 26).foregroundStyle(Theme.safelight)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(cloud.name).foregroundStyle(.primary)
                                Text(cloud.help).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if connected && AutoBackup.cloudName == cloud.name {
                                Image(systemName: "checkmark").foregroundStyle(Theme.safelight)
                            }
                        }
                    }
                }
            } header: {
                Text(connected ? "다른 클라우드로 바꾸기" : "연결할 클라우드")
            } footer: {
                Text("누르면 파일 앱 창이 열려요. 그 클라우드 안에서 백업을 둘 폴더를 고르고 '열기'를 누르세요.")
            }

            Section {
                #if os(iOS)
                Button("설정 앱에서 필름함 권한 보기", systemImage: "gear") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                }
                #endif
                if connected {
                    Button("연결 끊기", role: .destructive) { confirmDisconnect = true }
                }
            } footer: {
                Text("폴더 연결은 따로 권한을 받지 않아요. 저장이 안 되면 폴더를 다시 고르거나, 설정 > 필름함에서 권한을 확인해 주세요.")
            }
        }
        .navigationTitle("클라우드 백업")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .fileImporter(isPresented: $picking, allowedContentTypes: [.folder]) { result in
            guard case .success(let url) = result else { return }
            AutoBackup.setFolder(url)
            AutoBackup.cloudName = pendingCloud
            if let failure = AutoBackup.verify() {
                message = (failure, false)
            } else {
                do {
                    try AutoBackup.run(context, force: true)
                    message = ("\(AutoBackup.cloudName ?? url.lastPathComponent)에 연결하고 첫 백업을 올렸어요.", true)
                } catch {
                    message = ("연결했지만 백업을 올리지 못했어요.", false)
                }
            }
            revision += 1
        }
        .confirmationDialog("클라우드의 '\(DataBackup.fileName)'로 기록을 되살릴까요? 지금 있는 기록은 지우지 않고 합쳐요.", isPresented: $confirmRestore, titleVisibility: .visible) {
            Button("복구") {
                do {
                    let c = try AutoBackup.restoreFromFolder(context)
                    message = ("카메라 \(c.cameras)대, 롤 \(c.rolls)개를 되살렸어요. 사진은 '사진으로 롤 복구'로 붙여 주세요.", true)
                } catch {
                    message = ("클라우드에서 백업 파일을 읽지 못했어요. 연결 확인을 눌러 보세요.", false)
                }
                revision += 1
            }
        }
        .confirmationDialog("클라우드 연결을 끊을까요? 이미 올린 백업 파일은 그대로 남아요.", isPresented: $confirmDisconnect, titleVisibility: .visible) {
            Button("연결 끊기", role: .destructive) {
                AutoBackup.clearFolder()
                message = nil
                revision += 1
            }
        }
    }
}
