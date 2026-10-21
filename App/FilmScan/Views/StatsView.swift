import SwiftUI
import SwiftData

/// 통계: 많이 쓴 필름·카메라·렌즈·필터, 총 롤·사진, 장비에 쓴 돈
struct StatsView: View {
    @Query private var rolls: [RollItem]
    @Query private var lenses: [LensItem]

    var body: some View {
        let live = rolls.filter { $0.deletedAt == nil }
        var lensCounts: [String: Int] = [:]
        var filterCounts: [String: Int] = [:]
        for roll in live {
            if let name = roll.lens?.displayName { lensCounts[name, default: 0] += 1 }
            for change in roll.lensChanges {
                lensCounts[lenses.first { $0.id == change.lensID }?.displayName ?? "렌즈", default: 0] += 1
            }
            for shot in roll.meterShots {
                for name in shot.filters ?? [] { filterCounts[name, default: 0] += 1 }
            }
        }
        let photos = live.reduce(0) { $0 + max($1.frameCount ?? 0, $1.frames?.count ?? 0) }
        return List {
            Section {
                LabeledContent("총 롤", value: "\(live.count)")
                LabeledContent("총 사진", value: "\(photos)")
                NavigationLink("장비에 쓴 돈") { SpendingView() }
            }
            ranking("자주 쓴 필름", Dictionary(grouping: live, by: \.filmName).mapValues(\.count), unit: "롤")
            ranking("많이 사용한 카메라", Dictionary(grouping: live, by: \.cameraName).mapValues(\.count), unit: "롤")
            ranking("많이 사용한 렌즈", lensCounts, unit: "롤")
            ranking("많이 사용한 필터", filterCounts, unit: "컷")
        }
        .navigationTitle("통계")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    @ViewBuilder
    private func ranking(_ title: String, _ counts: [String: Int], unit: String) -> some View {
        Section(title) {
            let top = counts.sorted { $0.value == $1.value ? $0.key < $1.key : $0.value > $1.value }.prefix(5)
            if top.isEmpty {
                Text("기록이 없어요").foregroundStyle(.secondary)
            } else {
                ForEach(Array(top.enumerated()), id: \.offset) { i, item in
                    LabeledContent("\(i + 1). \(item.key)", value: "\(item.value)\(unit)")
                }
            }
        }
    }
}
