import Foundation
import SwiftData
import SwiftUI
import FilmScanCore

/// 목록에 없는 필름을 직접 만든 것 (이름, 감도, 필름통 색)
@Model
final class CustomFilmItem {
    var id: String = "custom-\(UUID().uuidString)"
    var name: String = ""
    var iso: Int = 400
    var colorHex: String = "#FDB913"
    var isBlackAndWhite: Bool = false
    var createdAt: Date = Date()

    init(name: String, iso: Int, colorHex: String, isBlackAndWhite: Bool) {
        self.name = name
        self.iso = iso
        self.colorHex = colorHex
        self.isBlackAndWhite = isBlackAndWhite
    }

    var stock: FilmStock {
        FilmStockCatalog.customStock(id: id, name: name, iso: iso, colorHex: colorHex, blackAndWhite: isBlackAndWhite)
    }
}

/// 저장된 직접 만든 필름을 필름 목록(FilmStockCatalog.custom)에 채워 둔다. 바뀌면 다시 채운다.
struct CustomFilmSync: ViewModifier {
    @Query(sort: \CustomFilmItem.createdAt, order: .reverse) private var items: [CustomFilmItem]

    func body(content: Content) -> some View {
        content
            .onAppear { sync() }
            .onChange(of: items.map { "\($0.id)|\($0.name)|\($0.iso)|\($0.colorHex)|\($0.isBlackAndWhite)" }) { _, _ in sync() }
    }

    private func sync() { FilmStockCatalog.custom = items.map(\.stock) }
}

extension View {
    func syncCustomFilms() -> some View { modifier(CustomFilmSync()) }
}
