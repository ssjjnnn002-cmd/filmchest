import SwiftUI
import SwiftData
import PhotosUI
import UniformTypeIdentifiers

/// 설정: 화면, 사진 앱, 삭제 복구, 장비 백업
struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @AppStorage(AppSettings.Key.appearance, store: AppSettings.defaults) private var appearance: AppearanceMode = .system
    @AppStorage(AppSettings.Key.albumMode, store: AppSettings.defaults) private var albumMode: AlbumMode = .perRoll
    @State private var showPaywall = false
    @State private var showLogin = false
    @State private var confirmLogout = false
    @State private var confirmWipe = false
    /// 숨은 시험 화면: '앱 버전' 줄을 7번 누르면 열린다 (노출계 시험)
    @AppStorage("meterLabUnlocked") private var labUnlocked = false
    @State private var versionTaps = 0
    @State private var usedBytes: Int64?
    @State private var logoutStep: String?
    @State private var accountRevision = 0
    @State private var note: String?
    @AppStorage(AppSettings.Key.meterOffset, store: AppSettings.defaults) private var meterOffset = AppSettings.meterDefault
    @State private var profiles: [MeterProfile] = []
    @State private var profileName = ""
    var showsDoneButton = true

    private static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.5.1"
    }


    var body: some View {
        NavigationStack {
            Form {
                Section("화면") {
                    Picker("테마", selection: $appearance) {
                        ForEach(AppearanceMode.allCases) { Text($0.displayName).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }

                Section("계정") {
                    let _ = accountRevision
                    if GoogleAuth.isConnected {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(GoogleAuth.account ?? "구글 계정")
                            Text("기록과 사진을 내 구글 드라이브에 맞춰요").font(.caption).foregroundStyle(.secondary)
                        }
                        Button("로그아웃", role: .destructive) { confirmLogout = true }
                    } else {
                        Button("구글로 로그인") { showLogin = true }.tint(Theme.safelight)
                    }
                }

                // 웹·갤럭시와 같은 자리: 계정 바로 아래 통계 · 백업 및 복구
                Section {
                    NavigationLink("통계") { StatsView() }
                    NavigationLink {
                        BackupRestoreView()
                    } label: {
                        LabeledContent("백업 및 복구", value: CloudStatus.text)
                    }
                }
                Section {
                    LabeledContent("이 앱에 저장된 양", value: Resolution.bytes(usedBytes) ?? "—")
                } header: {
                    Text("저장")
                } footer: {
                    let _ = accountRevision
                    Text(GoogleAuth.isConnected
                         ? "기록과 사진은 이 앱과 내 구글 드라이브에 저장돼요. 같은 계정으로 로그인한 기기에서만 보여요."
                         : "기록과 사진은 이 앱 안에만 저장돼요. 앱을 지우면 함께 지워지니, 구글로 로그인하거나 백업해 두세요.")
                }

                if Features.meter { meterSection }

                Section {
                    Picker("저장 방식", selection: $albumMode) {
                        ForEach(AlbumMode.allCases) { mode in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(mode.displayName)
                                Text(mode.detail).font(.caption).foregroundStyle(.secondary)
                            }
                            .tag(mode)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                } header: {
                    Text("사진 앱에 저장")
                } footer: {
                    Text("앞으로 불러오는 스캔부터 적용돼요. 이미 저장한 사진은 그대로예요.")
                }

                if Subscriptions.subscriptionEnabled {
                    Section {
                        if Subscriptions.shared.isSubscribed {
                            LabeledContent("필름함 Plus", value: "구독 중")
                        } else {
                            LabeledContent("무료 롤", value: "\(RollQuota.used(in: context))/\(RollQuota.freeLimit)")
                            Button("구독") { showPaywall = true }
                        }
                        Button("구매 복원") { Task { await Subscriptions.shared.restore() } }
                    } header: {
                        Text("구독")
                    } footer: {
                        Text("롤 \(RollQuota.freeLimit)개까지는 무료예요. 기록과 사진은 이 기기에만 남아요. \(Subscriptions.shared.priceText) 구독은 그다음 롤을 추가할 때 필요해요.")
                    }
                }

                Section("안내") {
                    NavigationLink("개인정보 처리방침") { PrivacyPolicyView() }
                }

                Section {
                    LabeledContent("앱 버전", value: Self.appVersion)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            versionTaps += 1
                            if versionTaps >= 7 { labUnlocked = true }
                        }
                    if labUnlocked {
                        NavigationLink("노출계 시험") { MeterLabView() }
                    }
                } header: {
                    Text("버전")
                }

                Section {
                    Button("모든 기록 지우기", role: .destructive) { confirmWipe = true }
                } footer: {
                    Text("필름함 \(Self.appVersion)")
                        .frame(maxWidth: .infinity)
                        .padding(.top, 24)
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .sheet(isPresented: $showLogin, onDismiss: { accountRevision += 1 }) { WelcomeView(loginOnly: true) }
            .confirmationDialog("로그아웃할까요? 기록과 사진을 드라이브에 올린 뒤 이 기기에서 지워요. 다시 로그인하면 받아 와요. 사진 앱의 사진은 그대로예요.", isPresented: $confirmLogout, titleVisibility: .visible) {
                Button("로그아웃", role: .destructive) {
                    logoutStep = "준비 중…"
                    Task {
                        do {
                            try await DriveSync.signOutAndClear(context) { logoutStep = $0 }
                        } catch {
                            note = "드라이브에 다 올리지 못해서 로그아웃하지 않았어요. 기록은 이 기기에 그대로 있어요. (\(error.localizedDescription))"
                        }
                        logoutStep = nil
                        accountRevision += 1
                    }
                }
            }
            .confirmationDialog(GoogleAuth.isConnected
                                ? "카메라, 렌즈, 롤, 저장한 사진을 이 기기에서 모두 지울까요? 구글 드라이브의 기록은 그대로 두고 로그아웃돼요. 사진 앱의 사진은 그대로예요. 되돌릴 수 없어요."
                                : "카메라, 렌즈, 롤, 저장한 사진을 모두 지울까요? 사진 앱의 사진은 그대로예요. 되돌릴 수 없어요.",
                                isPresented: $confirmWipe, titleVisibility: .visible) {
                Button("모두 지우기", role: .destructive) {
                    do {
                        try DriveSync.wipeDevice(context)
                        dismiss()
                    } catch {
                        note = "지우지 못했어요. (\(error.localizedDescription))"
                    }
                    accountRevision += 1
                }
            }
            .overlay {
                if let logoutStep {
                    ZStack {
                        Color.black.opacity(0.25).ignoresSafeArea()
                        VStack(spacing: 12) {
                            ProgressView()
                            Text(logoutStep).monospacedDigit()
                        }
                        .padding(24)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 20))
                    }
                }
            }
            .alert("복구", isPresented: Binding(get: { note != nil }, set: { if !$0 { note = nil } })) {
                Button("확인", role: .cancel) { note = nil }
            } message: {
                Text(note ?? "")
            }
            .task {
                Trash.purge(in: context)
                if Subscriptions.subscriptionEnabled { await Subscriptions.shared.refreshEntitlement() }
            }
            .navigationTitle("설정")
            .onAppear {
                profiles = AppSettings.meterProfiles
                usedBytes = Self.storeSize()
            }
            .toolbar {
                if showsDoneButton {
                    ToolbarItem(placement: .confirmationAction) { Button("완료") { dismiss() } }
                }
            }
        }
        #if os(macOS)
        .frame(minWidth: 460, minHeight: 480)
        #endif
    }

    /// 기록 저장소 폴더(사진 썸네일 포함) 크기. 웹 '이 브라우저에 저장된 양'과 같은 자리
    private static func storeSize() -> Int64 {
        let fm = FileManager.default
        guard let e = fm.enumerator(at: Store.directory, includingPropertiesForKeys: [.totalFileAllocatedSizeKey, .fileSizeKey]) else { return 0 }
        var total: Int64 = 0
        for case let url as URL in e {
            let v = try? url.resourceValues(forKeys: [.totalFileAllocatedSizeKey, .fileSizeKey])
            total += Int64(v?.totalFileAllocatedSize ?? v?.fileSize ?? 0)
        }
        return total
    }

    private var meterSection: some View {
        Section {
            HStack {
                Text(String(format: "%+.1f EV", meterOffset)).monospacedDigit().frame(width: 72, alignment: .leading)
                Slider(value: $meterOffset, in: -2...2, step: 0.1)
            }
            ForEach(profiles) { profile in
                Button(profile.name) { meterOffset = profile.value }
            }
            TextField("프로필 이름", text: $profileName)
            Button("프로필 추가") {
                let name = profileName.trimmingCharacters(in: .whitespaces)
                guard !name.isEmpty else { return }
                profiles.append(MeterProfile(id: UUID().uuidString, name: name, value: meterOffset))
                AppSettings.meterProfiles = profiles
                profileName = ""
            }
            .disabled(profileName.trimmingCharacters(in: .whitespaces).isEmpty)
            Button("교정 초기화") { meterOffset = AppSettings.meterDefault }
        } header: {
            Text("노출계 보정")
        } footer: {
            Text("0.0이 가운데예요. 아이폰 기본은 −0.2 EV예요.")
        }
    }
}
