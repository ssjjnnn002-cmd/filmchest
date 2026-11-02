import SwiftUI
import SwiftData
import Charts
import FilmScanCore

/// 통계: 숫자 타일, 월별 롤 그래프, 컬러·흑백, 많이 쓴 필름·카메라·렌즈·필터, 장비에 쓴 돈 (웹·갤럭시와 같은 구성)
struct StatsView: View {
    @Query private var rolls: [RollItem]
    @Query private var lenses: [LensItem]

    private struct Month: Identifiable { let id: Int; let date: Date; let count: Int }
    private struct Rank: Identifiable { var id: String { name }; let name: String; let count: Int; let film: FilmStock? }

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
        let months = Self.months(live)
        let thisYear = live.filter { Calendar.current.isDate(Self.start($0), equalTo: Date(), toGranularity: .year) }.count
        let bw = live.filter { $0.film?.process == .bw }.count
        let filmRanks = Dictionary(grouping: live, by: \.filmStockID).map { Rank(name: $0.value[0].filmName, count: $0.value.count, film: $0.value[0].film) }
        return List {
            Section {
                HStack(spacing: 8) {
                    tile("총 롤", live.count)
                    tile("총 사진", photos)
                    tile("올해 롤", thisYear)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }

            Section("월별 롤 · 최근 12달") {
                let peak = months.max { $0.count < $1.count }
                Chart(months) { m in
                    BarMark(x: .value("달", m.date, unit: .month), y: .value("롤", m.count), width: .ratio(0.55))
                        .foregroundStyle(Theme.safelight)
                        .clipShape(UnevenRoundedRectangle(topLeadingRadius: 4, topTrailingRadius: 4))
                        .annotation(position: .top) {
                            if m.id == peak?.id, m.count > 0 { Text("\(m.count)").font(.caption.weight(.semibold)) }
                        }
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: .month, count: 2)) { _ in
                        AxisValueLabel(format: .dateTime.month(.narrow), centered: true)
                    }
                }
                .chartYAxis(.hidden)
                .frame(height: 140)
                .padding(.vertical, 6)
                .accessibilityLabel(months.map { "\($0.date.formatted(.dateTime.year().month())) \($0.count)롤" }.joined(separator: ", "))
            }

            if !live.isEmpty {
                Section("컬러 · 흑백") {
                    VStack(alignment: .leading, spacing: 10) {
                        GeometryReader { geo in
                            HStack(spacing: 2) {
                                if live.count - bw > 0 {
                                    Rectangle().fill(Theme.safelight)
                                        .frame(width: max(2, (geo.size.width - (bw > 0 ? 2 : 0)) * CGFloat(live.count - bw) / CGFloat(live.count)))
                                }
                                if bw > 0 { Rectangle().fill(Color.secondary) }
                            }
                        }
                        .frame(height: 14)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        HStack(spacing: 16) {
                            legend(Theme.safelight, "컬러", live.count - bw)
                            legend(.secondary, "흑백", bw)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            ranking("자주 쓴 필름", filmRanks, unit: "롤")
            ranking("많이 사용한 카메라", Dictionary(grouping: live, by: \.cameraName).map { Rank(name: $0.key, count: $0.value.count, film: nil) }, unit: "롤")
            ranking("많이 사용한 렌즈", lensCounts.map { Rank(name: $0.key, count: $0.value, film: nil) }, unit: "롤")
            ranking("많이 사용한 필터", filterCounts.map { Rank(name: $0.key, count: $0.value, film: nil) }, unit: "컷")

            Section {
                NavigationLink("장비에 쓴 돈") { SpendingView() }
            }
        }
        .navigationTitle("통계")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private static func start(_ roll: RollItem) -> Date { roll.shootingDays.map(\.startedAt).min() ?? roll.loadedAt }

    /// 최근 12달 (이번 달 포함). 롤은 첫 촬영일 기준
    private static func months(_ rolls: [RollItem]) -> [Month] {
        let cal = Calendar.current
        let thisMonth = cal.date(from: cal.dateComponents([.year, .month], from: Date()))!
        return (0..<12).map { i in
            let date = cal.date(byAdding: .month, value: i - 11, to: thisMonth)!
            let count = rolls.filter { cal.isDate(start($0), equalTo: date, toGranularity: .month) }.count
            return Month(id: i, date: date, count: count)
        }
    }

    private func tile(_ label: String, _ value: Int) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value.formatted()).font(.system(size: 28, weight: .bold)).monospacedDigit()
            Text(label).font(.footnote).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 14).padding(.horizontal, 12)
        .background(RoundedRectangle(cornerRadius: 14).fill(Color(.secondarySystemGroupedBackground)))
    }

    private func legend(_ color: Color, _ label: String, _ count: Int) -> some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 3).fill(color).frame(width: 10, height: 10)
            Text(label).foregroundStyle(.secondary) + Text(" \(count)롤").fontWeight(.semibold)
        }
        .font(.subheadline)
    }

    /// 많이 쓴 순위: 이름 · 길이로 비교되는 막대 · 숫자
    @ViewBuilder
    private func ranking(_ title: String, _ items: [Rank], unit: String) -> some View {
        Section(title) {
            let top = items.sorted { $0.count == $1.count ? $0.name < $1.name : $0.count > $1.count }.prefix(5)
            let max = top.first?.count ?? 1
            if top.isEmpty {
                Text("기록이 없어요").foregroundStyle(.secondary)
            } else {
                ForEach(Array(top)) { item in
                    HStack(spacing: 10) {
                        if let film = item.film {
                            FilmCanisterView(stock: film).frame(width: 34, height: 40)
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.name).lineLimit(1)
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    Capsule().fill(Color(.tertiarySystemFill))
                                    Capsule().fill(Theme.safelight).frame(width: max > 0 ? geo.size.width * CGFloat(item.count) / CGFloat(max) : 0)
                                }
                            }
                            .frame(height: 6)
                        }
                        Text("\(item.count)\(unit)").fontWeight(.semibold).monospacedDigit().frame(minWidth: 44, alignment: .trailing)
                    }
                    .padding(.vertical, 2)
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}
