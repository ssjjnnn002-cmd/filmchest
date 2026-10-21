import SwiftUI

/// 블록 안 태그 한 줄. 태그가 없어도 같은 높이를 차지해서 블록 높이가 모두 같다.
struct TagLine: View {
    let tags: [String]
    var font: Font = .caption2.weight(.medium)

    var body: some View {
        Text(tags.isEmpty ? " " : tags.map { "#\($0)" }.joined(separator: " "))
            .font(font)
            .foregroundStyle(Theme.safelight)
            .lineLimit(1)
            .opacity(tags.isEmpty ? 0 : 1)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
