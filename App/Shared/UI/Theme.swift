import SwiftUI
import FilmScanCore

/// 인화지/암실 느낌의 색. 라이트는 따뜻한 종이색, 다크는 암실의 검정.
enum Theme {
    static let paper = Color.dynamic(light: (0.949, 0.941, 0.918), dark: (0.075, 0.071, 0.067))
    static let card = Color.dynamic(light: (0.988, 0.984, 0.973), dark: (0.125, 0.118, 0.110))
    static let shelf = Color.dynamic(light: (0.80, 0.76, 0.70), dark: (0.22, 0.20, 0.18))
    static let filmBase = Color(red: 0.11, green: 0.10, blue: 0.09)
    static let edgeInk = Color(red: 0.85, green: 0.81, blue: 0.72)
    static let safelight = Color(red: 0.87, green: 0.33, blue: 0.18)   // 암실 안전등 주황
}

extension Color {
    static func dynamic(light: (Double, Double, Double), dark: (Double, Double, Double)) -> Color {
        #if os(iOS)
        Color(UIColor { traits in
            let c = traits.userInterfaceStyle == .dark ? dark : light
            return UIColor(red: c.0, green: c.1, blue: c.2, alpha: 1)
        })
        #else
        Color(NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            let c = isDark ? dark : light
            return NSColor(srgbRed: c.0, green: c.1, blue: c.2, alpha: 1)
        })
        #endif
    }
}

extension Image {
    init(cgImage: CGImage) {
        self.init(decorative: cgImage, scale: 1)
    }
}

/// 필름 통 일러스트. 백그라운드에서 그리고 한 번 그린 것은 기억한다.
struct FilmCanisterView: View {
    let stock: FilmStock?
    var format: FilmFormat = .f135

    @State private var image: CGImage?

    var body: some View {
        Group {
            if let image {
                Image(cgImage: image).resizable().scaledToFit()
            } else if stock != nil {
                ProgressView().controlSize(.small).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Image(systemName: "film").resizable().scaledToFit().padding(20).foregroundStyle(.secondary)
            }
        }
        .task(id: stock.map { "\($0.id)|\($0.name)|\($0.iso)|\($0.style.body)" }) {
            guard let stock else { return }
            if let hit = CanisterCache.cached(stock, format: format) { image = hit; return }
            image = await CanisterCache.render(stock, format: format)
        }
        .accessibilityLabel(stock?.displayName ?? "필름")
    }
}

enum CanisterCache {
    private static let cache = NSCache<NSString, CGImage>()

    private static func key(_ stock: FilmStock, _ format: FilmFormat) -> NSString {
        "\(stock.id)|\(stock.name)|\(stock.iso)|\(stock.style.body)|\(format.is120)" as NSString
    }

    static func cached(_ stock: FilmStock, format: FilmFormat) -> CGImage? { cache.object(forKey: key(stock, format)) }

    static func render(_ stock: FilmStock, format: FilmFormat) async -> CGImage? {
        if let hit = cached(stock, format: format) { return hit }
        let image = await Task.detached(priority: .userInitiated) {
            FilmCanisterRenderer.render(stock, format: format, size: 480)
        }.value
        if let image { cache.setObject(image, forKey: key(stock, format)) }
        return image
    }

    /// 앱 시작 때 미리 그려 둔다
    static func prewarm() {
        Task.detached(priority: .utility) {
            for stock in FilmStockCatalog.all { _ = await render(stock, format: .f135) }
        }
    }
}

/// 카메라 사진(누끼). 큰 PNG는 백그라운드에서 줄여 읽는다.
struct CameraImageView: View {
    let data: Data?
    /// true면 칸을 꽉 채운다 (넘치는 부분은 잘림)
    var fill = false
    @State private var image: CGImage?

    var body: some View {
        Group {
            if let image {
                if fill {
                    Image(cgImage: image).resizable().scaledToFill()
                } else {
                    Image(cgImage: image).resizable().scaledToFit()
                }
            } else if data != nil {
                ProgressView().controlSize(.small)
            } else {
                Image(systemName: "camera.fill")
                    .resizable().scaledToFit()
                    .padding(28)
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task(id: data?.count) {
            guard let data else { image = nil; return }
            image = await Task.detached { ImageThumbnail.make(data: data, maxPixel: 900) }.value
        }
    }
}

struct StatusBadge: View {
    let status: RollStatus

    var body: some View {
        Text(status.displayName)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(color.opacity(0.15), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch status {
        case .loaded: Theme.safelight
        case .finished: .orange
        case .atLab: .blue
        case .imported: .green
        }
    }
}

extension Data {
    /// 배경을 지운 PNG(투명)인지. 그냥 사진(JPEG·HEIC)이면 블록을 꽉 채워 보여 준다.
    var isCutoutPNG: Bool { starts(with: [0x89, 0x50, 0x4E, 0x47]) }
}
