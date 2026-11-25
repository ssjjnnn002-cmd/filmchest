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

/// 입력 줄: 왼쪽 이름, 오른쪽 값 (값을 넣어도 무엇인지 보이게. 웹·갤럭시와 같은 모양)
struct LabeledField: View {
    let label: String
    @Binding var text: String
    var prompt = ""
    @FocusState private var focused: Bool

    init(_ label: String, text: Binding<String>, prompt: String = "") {
        self.label = label
        _text = text
        self.prompt = prompt
    }

    var body: some View {
        HStack(spacing: 12) {
            Text(label).lineLimit(1).fixedSize()
            TextField(prompt, text: $text).multilineTextAlignment(.trailing).focused($focused)
        }
        .contentShape(Rectangle())
        .onTapGesture { focused = true }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
    }
}

/// 안 적어도 되는 날짜: 적기 전에는 '기록 안 함', 누르면 달력으로 고른다 (웹·갤럭시와 같음)
struct OptionalDateRow: View {
    let label: String
    @Binding var isSet: Bool
    @Binding var date: Date

    var body: some View {
        HStack {
            if isSet {
                DatePicker(label, selection: $date, displayedComponents: .date)
                Button { isSet = false } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.secondary) }
                    .buttonStyle(.borderless)
                    .accessibilityLabel("\(label) 지우기")
            } else {
                Text(label)
                Spacer()
                Button("기록 안 함") { date = Date(); isSet = true }
                    .buttonStyle(.borderless)
                    .tint(.secondary)
            }
        }
    }
}

extension View {
    /// 입력 창도 앱과 같은 종이색 바탕 (시스템 회색 대신)
    func filmForm() -> some View {
        formStyle(.grouped).scrollContentBackground(.hidden).background(Theme.paper)
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
    /// 칸을 꽉 채운다 (썸네일처럼, 넘치는 가장자리는 잘림)
    var fill = false

    @State private var image: CGImage?

    var body: some View {
        Group {
            if let image {
                Image(cgImage: image).resizable().aspectRatio(contentMode: fill ? .fill : .fit)
            } else if stock != nil {
                ProgressView().controlSize(.small).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Image(systemName: "film").resizable().scaledToFit().padding(20).foregroundStyle(.secondary)
            }
        }
        .task(id: stock.map { "\($0.id)|\($0.name)|\($0.iso)|\($0.style.body)|\(format.rawValue)" }) {
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
        "\(stock.id)|\(stock.name)|\(stock.iso)|\(stock.style.body)|\(format.rawValue)" as NSString
    }

    static func cached(_ stock: FilmStock, format: FilmFormat) -> CGImage? {
        cache.object(forKey: key(stock, format)) ?? bundledBox(stock, format: format)
    }

    /// 목록에 있는 필름은 웹과 같은 상자 그림(PNG, scripts/render-film-boxes.mjs)을 쓴다. 직접 만든 필름은 없어서 그린다
    private static func bundledBox(_ stock: FilmStock, format: FilmFormat) -> CGImage? {
        #if canImport(UIKit)
        let k: String
        switch format {
        case .f110: k = "110"
        case .sheet45: k = "45"
        case .sheet810: k = "810"
        case .instaxMini, .instaxSquare, .instaxWide, .polaroid: k = "inst"
        default: k = format.is120 ? "120" : "135"
        }
        guard let image = UIImage(named: "filmbox-\(stock.id)-\(k)")?.cgImage else { return nil }
        cache.setObject(image, forKey: key(stock, format))
        return image
        #else
        return nil
        #endif
    }

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
            .lineLimit(1)
            .fixedSize()
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
