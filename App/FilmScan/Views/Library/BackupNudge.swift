import SwiftUI
import SwiftData

/// 백업 알림: 기록이 있는데 기기 밖으로 백업한 적이 없거나 오래됐으면 내 장비 위에 한 번 알려 준다 (웹·갤럭시와 같은 규칙)
enum BackupNudgeRule {
    static let staleDays = 14
    static let snoozeDays = 7
    static let fileKey = "filmscan.fileBackupLast"
    static let snoozeKey = "filmscan.backupNudgeAt"

    static func markFileBackup() { UserDefaults.standard.set(Date(), forKey: fileKey) }

    /// 폴더(아이클라우드 등), 구글 드라이브, 파일 저장 중 가장 최근
    static var lastBackup: Date? {
        [AutoBackup.lastBackup, DriveSync.lastSync, UserDefaults.standard.object(forKey: fileKey) as? Date].compactMap { $0 }.max()
    }

    /// 알릴 때면 nil이 아닌 값: 0이면 한 번도 안 함, 그 밖엔 지난 날 수
    static func state(hasData: Bool, now: Date = Date()) -> Int? {
        guard hasData else { return nil }
        if let snoozed = UserDefaults.standard.object(forKey: snoozeKey) as? Date,
           now.timeIntervalSince(snoozed) < Double(snoozeDays) * 86_400 { return nil }
        guard let last = lastBackup else { return 0 }
        let days = Int(now.timeIntervalSince(last) / 86_400)
        return days >= staleDays ? days : nil
    }
}

struct BackupNudgeCard: View {
    @Query private var rolls: [RollItem]
    @State private var hidden = false
    @State private var showBackup = false
    /// 백업 화면을 닫으면 다시 계산한다 (백업했으면 카드가 사라진다)
    @State private var refresh = 0

    var body: some View {
        let _ = refresh
        if !hidden, let state = BackupNudgeRule.state(hasData: !rolls.isEmpty) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "arrow.down.to.line").foregroundStyle(Theme.safelight)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(state == 0 ? "아직 백업하지 않았어요" : "백업한 지 \(state)일 지났어요").font(.subheadline.weight(.semibold))
                        Text("기록은 이 아이폰에만 있어요. 앱을 지우거나 휴대폰을 바꾸면 함께 사라져요.")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                HStack {
                    Spacer()
                    Button("나중에") {
                        UserDefaults.standard.set(Date(), forKey: BackupNudgeRule.snoozeKey)
                        hidden = true
                    }
                    Button("백업하기") { showBackup = true }.fontWeight(.semibold)
                }
                .font(.subheadline)
                .tint(Theme.safelight)
            }
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 16).fill(Color(.secondarySystemGroupedBackground)))
            .padding(.horizontal)
            .padding(.bottom, 8)
            .sheet(isPresented: $showBackup, onDismiss: { refresh += 1 }) {
                NavigationStack {
                    BackupRestoreView()
                        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("완료") { showBackup = false } } }
                }
            }
        }
    }
}
