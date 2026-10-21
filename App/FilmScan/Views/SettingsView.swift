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
    @Query(sort: \CameraItem.sortOrder) private var cameras: [CameraItem]
    @Query(sort: \LensItem.createdAt) private var lenses: [LensItem]
    @Query(sort: \RollItem.loadedAt, order: .reverse) private var rolls: [RollItem]
    @State private var showPaywall = false
    @State private var gearDoc = GearDocument(data: Data())
    @State private var showExport = false
    @State private var showImport = false
    @State private var restoreItems: [PhotosPickerItem] = []
    @State private var note: String?
    @AppStorage(AppSettings.Key.meterOffset, store: AppSettings.defaults) private var meterOffset = AppSettings.meterDefault
    @State private var profiles: [MeterProfile] = []
    @State private var profileName = ""
    var showsDoneButton = true

    private static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.5.0"
    }

    private var trashed: [RollItem] {
        rolls.filter { $0.deletedAt != nil }.sorted { ($0.deletedAt ?? .distantPast) > ($1.deletedAt ?? .distantPast) }
    }
    private var trashedCameras: [CameraItem] {
        cameras.filter { $0.deletedAt != nil }.sorted { ($0.deletedAt ?? .distantPast) > ($1.deletedAt ?? .distantPast) }
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

                Section {
                    NavigationLink("통계") { StatsView() }
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

                Section {
                    if trashed.isEmpty {
                        Text("최근 24시간 안에 지운 롤이 없어요").foregroundStyle(.secondary)
                    }
                    ForEach(trashed) { roll in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(roll.filmName)
                                Text(roll.cameraName).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            // 목록 한 줄에 버튼이 둘이면 한 번 눌러도 둘 다 눌린다 → 각각 따로 눌리게
                            Button("되돌리기") { roll.deletedAt = nil }
                                .buttonStyle(.borderless)
                            Button("지금 지우기", role: .destructive) { context.delete(roll) }
                                .buttonStyle(.borderless)
                        }
                    }
                } header: {
                    Text("삭제한 롤")
                } footer: {
                    Text("지운 롤은 24시간 동안 여기 남아요. 그 뒤에는 기록만 지워지고, 사진 앱의 사진은 그대로예요.")
                }

                Section {
                    if trashedCameras.isEmpty {
                        Text("최근 24시간 안에 지운 카메라가 없어요").foregroundStyle(.secondary)
                    }
                    ForEach(trashedCameras) { camera in
                        HStack {
                            Text(camera.displayName)
                            Spacer()
                            Button("되돌리기") { camera.deletedAt = nil }
                                .buttonStyle(.borderless)
                            Button("지금 지우기", role: .destructive) {
                                for roll in camera.rolls ?? [] { roll.rememberCamera() }
                                context.delete(camera)
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                } header: {
                    Text("삭제한 장비")
                } footer: {
                    Text("지운 카메라는 24시간 동안 여기 남아요. 필름에 적힌 카메라 정보는 카메라를 지워도 그대로예요.")
                }

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

                Section {
                    NavigationLink("개인정보 처리방침") { PrivacyPolicyView() }
                }

                Section {
                    LabeledContent("앱 버전", value: Self.appVersion)
                } header: {
                    Text("버전")
                }
            }
            .formStyle(.grouped)
            .filmKeyboard()
            .sheet(isPresented: $showPaywall) { PaywallView() }
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
            .task {
                Trash.purge(in: context)
                if Subscriptions.subscriptionEnabled { await Subscriptions.shared.refreshEntitlement() }
            }
            .navigationTitle("설정")
            .onAppear { profiles = AppSettings.meterProfiles }
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

    private var keptRolls: [RollItem] { rolls.filter { $0.deletedAt == nil } }

    private func topName(_ counts: [String: Int]) -> String {
        counts.max { $0.value < $1.value }?.key ?? "—"
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
