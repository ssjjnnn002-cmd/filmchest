import SwiftUI
import FilmScanCore

/// 필름 롤을 펼친 모양으로 촬영 순서대로 보기
struct FilmStripView: View {
    let roll: RollItem
    var onSelect: (FrameItem) -> Void

    private let frameHeight: CGFloat = 132

    var body: some View {
        let frames = roll.sortedFrames
        let frameWidth = frameHeight * CGFloat(roll.format.frameAspect)
        let rebate = roll.format.is120 ? 10.0 : frameHeight * 5.5 / 24

        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: frameWidth * 0.055) {
                ForEach(frames) { frame in
                    Button { onSelect(frame) } label: {
                        VStack(spacing: 0) {
                            edge(top: true, frame: frame, width: frameWidth, rebate: rebate)
                            FrameThumb(data: frame.thumbnail)
                                .frame(width: frameWidth, height: frameHeight)
                                .clipped()
                                .overlay(alignment: .topTrailing) {
                                    if frame.isFavorite {
                                        Image(systemName: "heart.fill")
                                            .font(.caption)
                                            .foregroundStyle(Theme.safelight)
                                            .padding(5)
                                            .shadow(radius: 2)
                                    }
                                }
                            edge(top: false, frame: frame, width: frameWidth, rebate: rebate)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .background(Theme.filmBase)
            // 퍼포레이션 구멍을 뚫는다 (뒤 배경이 비쳐 보이게)
            .compositingGroup()
        }
        .frame(height: frameHeight + rebate * 2)
    }

    /// 퍼포레이션과 가장자리 인쇄
    private func edge(top: Bool, frame: FrameItem, width: CGFloat, rebate: CGFloat) -> some View {
        ZStack(alignment: .leading) {
            if !roll.format.is120 {
                HStack(spacing: width / 8 - 7) {
                    ForEach(0..<8, id: \.self) { _ in
                        RoundedRectangle(cornerRadius: 1.5).fill(.black).frame(width: 7, height: rebate * 0.36)
                            .blendMode(.destinationOut)
                    }
                }
                .frame(maxHeight: .infinity, alignment: top ? .top : .bottom)
                .padding(.vertical, rebate * 0.12)
            }
            Text(top ? (roll.film?.edgeMarking ?? "") : "\(frame.index)  ▸  \(frame.index)A")
                .font(.system(size: rebate * 0.24, weight: .bold, design: .monospaced))
                .foregroundStyle(Theme.edgeInk)
                .lineLimit(1)
                .frame(maxHeight: .infinity, alignment: top ? .bottom : .top)
                .padding(.vertical, rebate * 0.06)
                .padding(.leading, 6)
        }
        .frame(width: width, height: rebate)
    }
}

private struct FrameThumb: View {
    let data: Data?
    @State private var image: CGImage?

    var body: some View {
        ZStack {
            Color.black
            if let image {
                Image(cgImage: image).resizable().scaledToFill()
            }
        }
        .task(id: data) {
            guard let data else { return }
            image = await Task.detached { ImageThumbnail.make(data: data, maxPixel: 400) }.value
        }
    }
}
