import SwiftUI
import SwiftData

/// 장비에 쓴 돈: 전체 합계, 종류별, 카메라 조합(카메라 + 렌즈 + 액세서리), 장비별, 필름
struct SpendingView: View {
    @Query(sort: \CameraItem.sortOrder) private var allCameras: [CameraItem]
    @Query(sort: \LensItem.createdAt) private var lenses: [LensItem]
    @Query(sort: \FilterItem.createdAt) private var accessories: [FilterItem]
    @Query(sort: \FilmLotItem.createdAt, order: .reverse) private var lots: [FilmLotItem]

    private var cameras: [CameraItem] { allCameras.filter { $0.deletedAt == nil } }
    private func v(_ p: String?) -> Int { PriceSum.value(p) }
    private var cameraSum: Int { cameras.reduce(0) { $0 + v($1.price) } }
    private var lensSum: Int { lenses.reduce(0) { $0 + v($1.price) } }
    private var accessorySum: Int { accessories.reduce(0) { $0 + v($1.price) } }
    private var filmSum: Int { lots.reduce(0) { $0 + v($1.price) } }
    private var gearSum: Int { cameraSum + lensSum + accessorySum }

    /// 카메라 상세와 같은 기준: 고른 렌즈, 아니면 같은 마운트 렌즈
    private func lenses(for c: CameraItem) -> [LensItem] {
        if c.lensesChosen { return c.linkedLensIDs.compactMap { id in lenses.first { $0.id == id } } }
        guard let mount = c.mount?.nilIfBlank else { return [] }
        return lenses.filter { $0.mount.caseInsensitiveCompare(mount) == .orderedSame }
    }
    private func accessories(for c: CameraItem) -> [FilterItem] {
        c.accessoryIDs.compactMap { id in accessories.first { $0.id == id } }
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("여태까지 쓴 돈").font(.subheadline).foregroundStyle(.secondary)
                    Text(PriceSum.text(gearSum + filmSum)).font(.largeTitle.bold()).monospacedDigit()
                }
                .padding(.vertical, 6)
                LabeledContent("장비", value: PriceSum.text(gearSum))
                LabeledContent("필름", value: PriceSum.text(filmSum))
            } footer: {
                Text("구입 금액을 적은 것만 더해요.")
            }

            Section("종류별") {
                row("카메라", cameraSum, count: cameras.count)
                row("렌즈", lensSum, count: lenses.count)
                row("액세서리", accessorySum, count: accessories.count)
                row("필름", filmSum, count: lots.count)
            }

            if !cameras.isEmpty {
                Section {
                    ForEach(cameras) { c in
                        let ls = lenses(for: c), acc = accessories(for: c)
                        let total = v(c.price) + ls.reduce(0) { $0 + v($1.price) } + acc.reduce(0) { $0 + v($1.price) }
                        DisclosureGroup {
                            item("본체", c.price)
                            ForEach(ls) { item("렌즈 · \($0.displayName)", $0.price) }
                            ForEach(acc) { item("\($0.kindName) · \($0.name)", $0.price) }
                        } label: {
                            LabeledContent(c.displayName, value: PriceSum.text(total))
                        }
                    }
                } header: {
                    Text("카메라 조합")
                } footer: {
                    Text("카메라 + 이 카메라에 쓰는 렌즈 + 액세서리. 렌즈를 여러 카메라에 쓰면 각 조합에 모두 들어가요.")
                }
            }

            gearSection("카메라", cameras.map { ($0.id, $0.displayName, $0.price) })
            gearSection("렌즈", lenses.map { ($0.id, $0.displayName, $0.price) })
            gearSection("액세서리", accessories.map { ($0.id, "\($0.kindName) · \($0.name)", $0.price) })
            gearSection("필름", lots.map { ($0.id, "\($0.title) · \($0.count)롤", $0.price) })
        }
        .navigationTitle("장비에 쓴 돈")
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }

    private func row(_ title: String, _ sum: Int, count: Int) -> some View {
        LabeledContent {
            Text(PriceSum.text(sum)).monospacedDigit()
        } label: {
            Text(title)
            Text("\(count)개").font(.caption)
        }
    }

    private func item(_ title: String, _ price: String?) -> some View {
        LabeledContent(title, value: price?.nilIfBlank.map { PriceSum.text(PriceSum.value($0)) } ?? "금액 없음")
            .font(.subheadline)
    }

    @ViewBuilder
    private func gearSection(_ title: String, _ items: [(UUID, String, String?)]) -> some View {
        if !items.isEmpty {
            Section("\(title)별") {
                ForEach(items.sorted { v($0.2) > v($1.2) }, id: \.0) { item($0.1, $0.2) }
            }
        }
    }
}
