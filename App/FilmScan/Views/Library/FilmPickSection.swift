import SwiftUI
import SwiftData
import FilmScanCore

/// 처음 쓰는 사람에게 먼저 보여줄 필름 (웹 popularFilms와 같음)
private let popularFilmIDs = ["kodak-portra-400", "kodak-gold-200", "ilford-hp5-plus", "kodak-ultramax-400",
                              "fuji-400", "kodak-trix-400", "cinestill-800t", "kodak-ektar-100"]

/// 필름 고르기 (필름 장착하기 · 필름 재고 추가가 같은 목록). 웹 ui/FilmPicker.tsx · 갤럭시 FilmPicker와 같음
/// 접혀 있을 땐 추천 6개를 가로로, '더보기'를 누르면 검색 + 정렬·묶기 칩(가로 스크롤) + 묶음별 바둑판
struct FilmPickSection<Footer: View>: View {
    @Binding var filmID: String?
    /// 카메라·재고의 규격 (이 규격에 맞는 필름만)
    var format: FilmFormat
    /// 재고 추가처럼 규격을 같이 고를 땐 모든 규격의 필름을 보여 주고, 고른 칸의 규격을 넘긴다
    var onFormat: ((FilmFormat) -> Void)? = nil
    @ViewBuilder var footer: () -> Footer

    /// 한 칸. format이 있으면 그 규격으로 보여 주고 고른다 (규격으로 묶을 때)
    private struct PickItem: Identifiable {
        let stock: FilmStock
        var format: FilmFormat?
        var id: String { "\(stock.id)|\(format?.rawValue ?? "")" }
    }

    @Query(sort: \RollItem.loadedAt, order: .reverse) private var rolls: [RollItem]
    @Query private var lots: [FilmLotItem]
    @Query(sort: \CustomFilmItem.createdAt, order: .reverse) private var customFilms: [CustomFilmItem]
    @State private var search = ""
    @State private var showAll = false
    @State private var customEdit: CustomTarget?
    /// 정렬·묶기는 필름 재고 탭과 같은 기준 (세 앱 같은 저장 이름)
    @AppStorage("filmPickGroup") private var group = GearGroup.brand.rawValue
    @AppStorage("filmPickBy") private var by = FilmLotSort.name.rawValue
    @AppStorage("filmPickDesc") private var descending = false

    private enum CustomTarget: Identifiable {
        case new, edit(CustomFilmItem)
        var id: String { if case .edit(let item) = self { return item.id }; return "new" }
    }


    private var stockByFilm: [String: Int] {
        lots.reduce(into: [:]) { $0[$1.filmStockID, default: 0] += max(0, $1.count) }
    }
    private var usedByFilm: [String: Int] {
        rolls.filter { $0.deletedAt == nil }.reduce(into: [:]) { $0[$1.filmStockID, default: 0] += 1 }
    }

    /// 추천 순서: 재고 있는 필름 → 많이 쓴 순 → 최근 쓴 순 → 기록이 없으면 많이 쓰는 필름 순
    private var stocks: [FilmStock] {
        let recent = rolls.map(\.filmStockID)
        let stock = stockByFilm, used = usedByFilm
        _ = customFilms.count // 직접 만든 필름이 바뀌면 다시 계산
        func rank(_ s: FilmStock) -> (Int, Int, Int, Int) {
            ((stock[s.id] ?? 0) > 0 ? 0 : 1, -(used[s.id] ?? 0), recent.firstIndex(of: s.id) ?? .max, popularFilmIDs.firstIndex(of: s.id) ?? .max)
        }
        return FilmStockCatalog.allIncludingCustom
            .filter { onFormat != nil || format.accepts($0.formats) }
            .filter { search.isEmpty || $0.displayName.localizedCaseInsensitiveContains(search) }
            .sorted { rank($0) < rank($1) }
    }

    /// 고른 필름은 규격·검색·순서와 상관없이 늘 보이게
    private var visible: [FilmStock] {
        let list = stocks
        let picked = filmID.flatMap(FilmStockCatalog.stock)
        if showAll {
            guard let picked, !list.contains(picked) else { return list }
            return [picked] + list
        }
        var top = Array(list.prefix(6))
        if let picked, !top.contains(picked) {
            if top.count < 6 { top.append(picked) } else { top[top.count - 1] = picked }
        }
        return top
    }

    private var sections: [(title: String?, items: [PickItem])] {
        let stock = stockByFilm, used = usedByFilm
        let sort = FilmLotSort(rawValue: by) ?? .name
        func key(_ s: FilmStock) -> Int { sort == .count ? stock[s.id] ?? 0 : sort == .usage ? used[s.id] ?? 0 : 0 }
        let asc = visible.sorted {
            (key($0), $0.displayName.lowercased(), $0.iso) < (key($1), $1.displayName.lowercased(), $1.iso)
        }
        let g = GearGroup(rawValue: group).flatMap { GearGroup.filmStock.contains($0) ? $0 : nil } ?? .brand
        let sorted = descending ? Array(asc.reversed()) : asc
        if g == .format {
            // 35mm·120처럼 여러 규격으로 나오는 필름은 규격마다 한 칸씩
            var items: [PickItem] = []
            for st in sorted {
                var seen = Set<String>()
                for f in st.formats where seen.insert(f.family.title).inserted { items.append(PickItem(stock: st, format: f)) }
            }
            return groupSections(items) { $0.format!.family }
        }
        return groupSections(sorted.map { PickItem(stock: $0) }) { $0.stock.groupKey(g) }
    }

    var body: some View {
        Section {
            if showAll {
                TextField("필름 검색", text: $search)
                // 정렬·묶기: 필름 재고 탭과 같은 기준, 가로로 넘겨 본다
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        // 묶기(1순위) → 오름/내림 → 정렬 기준(묶음 안 2순위, 눌러서 고름). 웹·갤럭시와 같음
                        ForEach(GearGroup.filmStock) { g in chip(g.title, on: group == g.rawValue) { group = g.rawValue } }
                        Rectangle().fill(.secondary.opacity(0.3)).frame(width: 1, height: 20).padding(.horizontal, 4)
                        chip(descending ? "내림차순 ↓" : "오름차순 ↑", on: false) { descending.toggle() }
                        Menu {
                            Picker("정렬 기준", selection: $by) {
                                ForEach(FilmLotSort.allCases) { Text($0.title).tag($0.rawValue) }
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text("정렬 기준 · \((FilmLotSort(rawValue: by) ?? .name).title)")
                                Image(systemName: "chevron.down").font(.caption2.weight(.semibold))
                            }
                            .font(.subheadline.weight(.medium)).lineLimit(1).fixedSize()
                            .padding(.horizontal, 12).frame(height: 32)
                            .foregroundStyle(.primary)
                            .background(Color.secondary.opacity(0.12), in: Capsule())
                        }
                        .buttonStyle(.borderless)
                    }
                    .padding(.vertical, 2)
                }
                .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
                ForEach(Array(sections.enumerated()), id: \.offset) { i, sec in
                    VStack(alignment: .leading, spacing: 6) {
                        if let t = sec.title {
                            Text("\(t) · \(sec.items.count)").font(.footnote.weight(.semibold)).foregroundStyle(.secondary)
                        }
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 92), spacing: 6)], spacing: 10) {
                            ForEach(sec.items) { cell($0) }
                            if i == sections.count - 1 { customCell }
                        }
                    }
                    .padding(.vertical, 4)
                }
            } else {
                // 추천 6개는 가로로 넘겨 본다 (아래 칸이 바로 보이게)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .top, spacing: 6) {
                        ForEach(visible) { cell(PickItem(stock: $0)).frame(width: 96) }
                        customCell.frame(width: 96)
                    }
                    .padding(.vertical, 4)
                }
            }
            if let film = filmID.flatMap(FilmStockCatalog.stock), film.isCustom, let item = customFilms.first(where: { $0.id == film.id }) {
                Button("\(film.displayName) 수정", systemImage: "pencil") { customEdit = .edit(item) }
                    .frame(maxWidth: .infinity)
            }
            Button {
                withAnimation { showAll.toggle() }
                if !showAll { search = "" }
            } label: {
                Label(showAll ? "접기" : "더보기 (\(stocks.count)종)", systemImage: showAll ? "chevron.up" : "chevron.down")
                    .frame(maxWidth: .infinity)
            }
        } header: {
            Text(showAll ? "필름" : "필름 · 추천")
        } footer: {
            footer()
        }
        .sheet(item: $customEdit) { target in
            switch target {
            case .new: CustomFilmEditView(item: nil) { if let id = $0 { filmID = id } }
            case .edit(let item): CustomFilmEditView(item: item) { filmID = $0 }
            }
        }
    }

    private func chip(_ title: String, on: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.subheadline.weight(.medium)).lineLimit(1).fixedSize()
                .padding(.horizontal, 12).frame(height: 32)
                .foregroundStyle(on ? .white : .primary)
                .background(on ? Theme.safelight : Color.secondary.opacity(0.12), in: Capsule())
        }
        .buttonStyle(.borderless)
    }

    private func cell(_ item: PickItem) -> some View {
        let stock = item.stock
        let count = stockByFilm[stock.id] ?? 0
        // 규격으로 묶은 칸은 그 규격, 아니면 지금 규격(안 맞으면 그 필름의 첫 규격)
        let shown = item.format ?? (format.accepts(stock.formats) ? format : stock.formats.first ?? format)
        let on = filmID == stock.id && shown.family.title == format.family.title
        return Button {
            filmID = stock.id
            if let onFormat, shown.family.title != format.family.title || item.format != nil { onFormat(shown) }
        } label: {
            VStack(spacing: 2) {
                FilmCanisterView(stock: stock, format: shown).frame(height: 84)
                VStack(spacing: 1) {
                    Text(stock.displayName).font(.caption2).lineLimit(2).multilineTextAlignment(.center)
                    if count > 0 {
                        Text("재고 \(count)롤").font(.system(size: 11)).monospacedDigit().foregroundStyle(.secondary)
                    } else if stock.isDiscontinued {
                        Text("단종").font(.system(size: 11)).foregroundStyle(.secondary)
                    }
                }
                .frame(height: 42, alignment: .top)
            }
            .padding(4)
            .background(RoundedRectangle(cornerRadius: 10).fill(on ? Theme.safelight.opacity(0.15) : .clear))
            .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(on ? Theme.safelight : .clear, lineWidth: 2))
        }
        .buttonStyle(.plain)
    }

    private var customCell: some View {
        Button { customEdit = .new } label: {
            VStack(spacing: 2) {
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(Theme.safelight.opacity(0.55), style: StrokeStyle(lineWidth: 1.5, dash: [5, 4]))
                    .overlay(Image(systemName: "plus").font(.title2.weight(.light)).foregroundStyle(Theme.safelight))
                    .frame(width: 76, height: 76)
                    .frame(height: 84)
                Text("직접 추가").font(.caption2.weight(.semibold)).foregroundStyle(Theme.safelight)
                    .frame(height: 42, alignment: .top)
            }
            .padding(4)
        }
        .buttonStyle(.plain)
    }
}
