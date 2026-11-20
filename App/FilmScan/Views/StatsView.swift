import SwiftUI
import SwiftData
import Charts
import FilmScanCore

/// 통계와 기록: 기간을 골라 보고, 막대를 누르면 그 기간의 롤이 나온다. 장비에 쓴 돈은 따로 크게 (웹·갤럭시와 같은 구성)
struct StatsView: View {
    @Query private var rolls: [RollItem]
    @Query private var lenses: [LensItem]
    @Query private var cameras: [CameraItem]
    @Query private var accessories: [FilterItem]
    @Query private var lots: [FilmLotItem]
    @AppStorage("statsPeriod") private var period: StatsPeriod = .months12
    /// 사용자 지정 기간 (초)
    @AppStorage("statsFrom") private var customFrom: Double = Date().addingTimeInterval(-90 * 86_400).timeIntervalSince1970
    @AppStorage("statsTo") private var customTo: Double = Date().timeIntervalSince1970
    @State private var selected: Bucket?

    struct Bucket: Identifiable, Equatable {
        let id: Int
        let start: Date
        let end: Date
        let rolls: [RollItem]
        var count: Int { rolls.count }
        static func == (a: Bucket, b: Bucket) -> Bool { a.id == b.id && a.start == b.start }
    }
    private struct Rank: Identifiable { var id: String { name }; let name: String; let count: Int; let film: FilmStock? }

    static func start(_ roll: RollItem) -> Date { roll.shootingDays.map(\.startedAt).min() ?? roll.loadedAt }

    var body: some View {
        let all = rolls.filter { $0.deletedAt == nil }
        let range = period == .custom
            ? Self.customRange(customFrom, customTo)
            : period.range(earliest: all.map(Self.start).min())
        let live = all.filter { range.contains(Self.start($0)) }
        let buckets = Self.buckets(live, range: range, unit: period.unit(for: range))
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
        let bw = live.filter { $0.film?.process == .bw }.count
        let filmRanks = Dictionary(grouping: live, by: \.filmStockID).map { Rank(name: $0.value[0].filmName, count: $0.value.count, film: $0.value[0].film) }
        let days = Set(live.flatMap { $0.shootingDays.map { Calendar.current.startOfDay(for: $0.startedAt) } }).count
        return List {
            Section {
                Picker("기간", selection: $period) {
                    ForEach(StatsPeriod.allCases) { Text($0.displayName).tag($0) }
                }
                .pickerStyle(.menu)
                .onChange(of: period) { _, _ in selected = nil }
                if period == .custom {
                    DatePicker("시작", selection: Binding(get: { Date(timeIntervalSince1970: customFrom) },
                                                         set: { customFrom = $0.timeIntervalSince1970; selected = nil }), displayedComponents: .date)
                    DatePicker("끝", selection: Binding(get: { Date(timeIntervalSince1970: customTo) },
                                                       set: { customTo = $0.timeIntervalSince1970; selected = nil }), displayedComponents: .date)
                }
            } footer: {
                Text(period.rangeText(range))
            }

            Section {
                HStack(spacing: 8) {
                    tile("롤", live.count)
                    tile("사진", photos)
                    tile("촬영한 날", days)
                }
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }

            Section {
                chart(buckets, unit: period.unit(for: range))
                if let b = selected { bucketDetail(b) }
            } header: {
                Text("롤 · \(period.unitName(for: range))별")
            } footer: {
                Text(selected == nil ? "막대를 누르면 그때 찍은 롤을 볼 수 있어요." : "다른 막대를 누르거나, 같은 막대를 다시 누르면 닫혀요.")
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

            records(live)

            spending(range)
        }
        .navigationTitle("통계와 기록")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    // MARK: 막대 그래프

    private func chart(_ buckets: [Bucket], unit: Calendar.Component) -> some View {
        let peak = buckets.max { $0.count < $1.count }
        return Chart(buckets) { b in
            BarMark(x: .value("기간", b.start, unit: unit),
                    y: .value("롤", b.count), width: .ratio(0.6))
                .foregroundStyle(selected == nil || selected?.id == b.id ? Theme.safelight : Theme.safelight.opacity(0.35))
                .clipShape(UnevenRoundedRectangle(topLeadingRadius: 4, topTrailingRadius: 4))
                .annotation(position: .top) {
                    if (selected?.id == b.id || (selected == nil && b.id == peak?.id)), b.count > 0 {
                        Text("\(b.count)").font(.caption.weight(.semibold))
                    }
                }
        }
        // 누른 자리의 날짜로 막대를 찾는다 (목록 안에서도 탭이 잘 먹게 직접 계산)
        .chartOverlay { proxy in
            GeometryReader { geo in
                Rectangle().fill(.clear).contentShape(Rectangle())
                    .onTapGesture { p in
                        guard let plot = proxy.plotFrame else { return }
                        let x = p.x - geo[plot].origin.x
                        guard let date: Date = proxy.value(atX: x),
                              let b = buckets.first(where: { date >= $0.start && date < $0.end }) else { return }
                        withAnimation { selected = selected?.id == b.id ? nil : b }
                    }
            }
        }
        .chartXAxis {
            switch unit {
            case .weekOfYear:
                AxisMarks(values: .stride(by: .weekOfYear, count: 2)) { _ in AxisValueLabel(format: .dateTime.month(.defaultDigits).day(), centered: true) }
            case .year:
                AxisMarks(values: .stride(by: .year)) { _ in AxisValueLabel(format: .dateTime.year(), centered: true) }
            default:
                AxisMarks(values: .stride(by: .month, count: buckets.count > 14 ? 3 : 2)) { _ in AxisValueLabel(format: .dateTime.month(.narrow), centered: true) }
            }
        }
        .chartYAxis(.hidden)
        .frame(height: 150)
        .padding(.vertical, 6)
        .accessibilityLabel(buckets.map { "\(bucketTitle($0)) \($0.count)롤" }.joined(separator: ", "))
    }

    private func bucketTitle(_ b: Bucket) -> String {
        let cal = Calendar.current
        let last = cal.date(byAdding: .day, value: -1, to: b.end) ?? b.end
        if cal.dateComponents([.month], from: b.start, to: b.end).month ?? 0 >= 12 { return b.start.formatted(.dateTime.year()) }
        if cal.dateComponents([.day], from: b.start, to: b.end).day ?? 0 > 7 { return b.start.formatted(.dateTime.year().month()) }
        return "\(Fmt.monthDay.string(from: b.start)) – \(Fmt.monthDay.string(from: last))"
    }

    /// 누른 막대: 그 기간 롤 수·사진 수·롤 목록
    @ViewBuilder
    private func bucketDetail(_ b: Bucket) -> some View {
        let photos = b.rolls.reduce(0) { $0 + max($1.frameCount ?? 0, $1.frames?.count ?? 0) }
        VStack(alignment: .leading, spacing: 4) {
            Text(bucketTitle(b)).font(.headline)
            Text("\(b.count)롤 · 사진 \(photos)장").font(.subheadline).foregroundStyle(.secondary)
        }
        ForEach(b.rolls.sorted { Self.start($0) < Self.start($1) }) { r in
            NavigationLink { RollDetailView(roll: r) } label: { RollRow(roll: r) }
        }
    }

    // MARK: 기록

    @ViewBuilder
    private func records(_ live: [RollItem]) -> some View {
        let places = Dictionary(grouping: live.flatMap { $0.locations.filter { !$0.name.isEmpty }.map(\.name) }, by: { $0 })
            .map { Rank(name: $0.key, count: $0.value.count, film: nil) }
        let labs = Dictionary(grouping: live.compactMap { $0.labName?.nilIfBlank }, by: { $0 })
            .map { Rank(name: $0.key, count: $0.value.count, film: nil) }
        ranking("자주 간 장소", places, unit: "롤")
        ranking("자주 맡긴 현상소", labs, unit: "롤")
        let shoot = live.compactMap { r in r.finishedAt.map { $0.timeIntervalSince(r.loadedAt) } }.filter { $0 > 0 }
        let lab = live.compactMap { r in r.droppedOffAt.flatMap { d in r.importedAt.map { $0.timeIntervalSince(d) } } }.filter { $0 > 0 }
        let first = live.map(Self.start).min(), last = live.map(Self.start).max()
        Section("기록") {
            LabeledContent("한 롤 다 찍는 데", value: avgDays(shoot))
            LabeledContent("맡기고 스캔 받기까지", value: avgDays(lab))
            if let first { LabeledContent("첫 롤", value: Fmt.day.string(from: first)) }
            if let last { LabeledContent("최근 롤", value: Fmt.day.string(from: last)) }
            LabeledContent("즐겨찾기한 롤", value: "\(live.filter(\.isFavorite).count)롤")
        }
    }

    private func avgDays(_ list: [TimeInterval]) -> String {
        guard !list.isEmpty else { return "기록 없음" }
        let d = list.reduce(0, +) / Double(list.count) / 86_400
        return d < 1 ? "하루 안" : "평균 \(Int(d.rounded()))일"
    }

    // MARK: 장비에 쓴 돈

    @ViewBuilder
    private func spending(_ range: ClosedRange<Date>) -> some View {
        let v = { (p: String?) in PriceSum.value(p) }
        let cams = cameras.filter { $0.deletedAt == nil }
        let kinds: [(String, Int, Int)] = [
            ("카메라", cams.reduce(0) { $0 + v($1.price) }, cams.filter { range.contains($0.purchasedAt ?? .distantPast) }.reduce(0) { $0 + v($1.price) }),
            ("렌즈", lenses.reduce(0) { $0 + v($1.price) }, lenses.filter { range.contains($0.purchasedAt ?? .distantPast) }.reduce(0) { $0 + v($1.price) }),
            ("액세서리", accessories.reduce(0) { $0 + v($1.price) }, accessories.filter { range.contains($0.purchasedAt ?? .distantPast) }.reduce(0) { $0 + v($1.price) }),
            ("필름", lots.reduce(0) { $0 + v($1.price) }, lots.filter { range.contains($0.purchasedAt ?? .distantPast) }.reduce(0) { $0 + v($1.price) }),
        ]
        let total = kinds.reduce(0) { $0 + $1.1 }
        let inPeriod = kinds.reduce(0) { $0 + $1.2 }
        Section {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("여태까지").font(.subheadline).foregroundStyle(.secondary)
                    Text(PriceSum.text(total)).font(.system(size: 30, weight: .bold)).monospacedDigit()
                    if period != .all {
                        Text("\(period.displayName) 구입 \(PriceSum.text(inPeriod))").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.safelight)
                    }
                }
                // 종류별 비율 막대
                GeometryReader { geo in
                    HStack(spacing: 2) {
                        ForEach(Array(kinds.enumerated()), id: \.offset) { i, k in
                            if k.1 > 0 {
                                Rectangle().fill(Theme.safelight.opacity(1 - Double(i) * 0.22))
                                    .frame(width: max(2, geo.size.width * CGFloat(k.1) / CGFloat(max(total, 1))))
                            }
                        }
                    }
                }
                .frame(height: 12)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                ForEach(Array(kinds.enumerated()), id: \.offset) { i, k in
                    HStack {
                        RoundedRectangle(cornerRadius: 3).fill(Theme.safelight.opacity(1 - Double(i) * 0.22)).frame(width: 10, height: 10)
                        Text(k.0)
                        Spacer()
                        Text(PriceSum.text(k.1)).monospacedDigit().fontWeight(.semibold)
                    }
                    .font(.subheadline)
                }
            }
            .padding(.vertical, 6)
            NavigationLink("장비별 · 카메라 조합 자세히") { SpendingView() }
        } header: {
            Text("장비에 쓴 돈")
        } footer: {
            Text("구입 금액을 적은 것만 더해요. 기간 구입은 구입일을 적은 것만이에요.")
        }
    }

    /// 사용자 지정: 시작일 0시부터 끝 날 밤까지 (거꾸로 골라도 순서대로)
    static func customRange(_ a: Double, _ b: Double) -> ClosedRange<Date> {
        let cal = Calendar.current
        let lo = cal.startOfDay(for: Date(timeIntervalSince1970: min(a, b)))
        let hi = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: Date(timeIntervalSince1970: max(a, b))))!.addingTimeInterval(-1)
        return lo...hi
    }

    /// 기간 안을 단위(주·달·해)로 나눈 막대
    static func buckets(_ rolls: [RollItem], range: ClosedRange<Date>, unit: Calendar.Component) -> [Bucket] {
        let cal = Calendar.current
        var from: Date
        switch unit {
        case .weekOfYear: from = cal.dateInterval(of: .weekOfYear, for: range.lowerBound)?.start ?? range.lowerBound
        case .year: from = cal.dateInterval(of: .year, for: range.lowerBound)?.start ?? range.lowerBound
        default: from = cal.dateInterval(of: .month, for: range.lowerBound)?.start ?? range.lowerBound
        }
        var out: [Bucket] = []
        var i = 0
        while from <= range.upperBound, i < 400 {
            let to = cal.date(byAdding: unit, value: 1, to: from)!
            let lo = from
            out.append(Bucket(id: i, start: lo, end: to, rolls: rolls.filter { let d = Self.start($0); return d >= lo && d < to }))
            from = to
            i += 1
        }
        return out
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

/// 통계 기간
enum StatsPeriod: String, CaseIterable, Identifiable {
    case days30, months3, months12, thisYear, lastYear, all, custom
    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .days30: "최근 30일"
        case .months3: "최근 3달"
        case .months12: "최근 12달"
        case .thisYear: "올해"
        case .lastYear: "작년"
        case .all: "전체"
        case .custom: "사용자 지정"
        }
    }

    func range(earliest: Date?, now: Date = Date()) -> ClosedRange<Date> {
        let cal = Calendar.current
        let y = cal.component(.year, from: now)
        switch self {
        case .days30: return cal.date(byAdding: .day, value: -29, to: cal.startOfDay(for: now))!...now
        case .months3: return cal.date(byAdding: .month, value: -2, to: cal.dateInterval(of: .month, for: now)!.start)!...now
        case .months12: return cal.date(byAdding: .month, value: -11, to: cal.dateInterval(of: .month, for: now)!.start)!...now
        case .thisYear: return cal.date(from: DateComponents(year: y, month: 1, day: 1))!...now
        case .lastYear:
            let s = cal.date(from: DateComponents(year: y - 1, month: 1, day: 1))!
            return s...cal.date(from: DateComponents(year: y, month: 1, day: 1))!.addingTimeInterval(-1)
        case .all, .custom: return min(earliest ?? now, now)...now
        }
    }

    /// 막대 하나의 단위: 짧으면 주, 길면 달, 2년 넘게 '전체'면 해
    func unit(for range: ClosedRange<Date>?) -> Calendar.Component {
        switch self {
        case .days30, .months3: return .weekOfYear
        case .all, .custom:
            guard let range else { return .month }
            let cal = Calendar.current
            // 사용자 지정은 짧으면 주 단위
            if self == .custom, (cal.dateComponents([.day], from: range.lowerBound, to: range.upperBound).day ?? 0) <= 100 { return .weekOfYear }
            return (cal.dateComponents([.month], from: range.lowerBound, to: range.upperBound).month ?? 0) > 24 ? .year : .month
        default: return .month
        }
    }
    func unitName(for range: ClosedRange<Date>) -> String {
        switch unit(for: range) {
        case .weekOfYear: "주"
        case .year: "해"
        default: "달"
        }
    }
    func rangeText(_ r: ClosedRange<Date>) -> String { "\(Fmt.day.string(from: r.lowerBound)) – \(Fmt.day.string(from: r.upperBound))" }
}
