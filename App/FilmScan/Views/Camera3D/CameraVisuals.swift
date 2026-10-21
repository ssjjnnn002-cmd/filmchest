import SwiftUI
import FilmScanCore

/// 360° 회전 사진 보기 (헤이딜러처럼 좌우로 끌어서 돌린다)
struct SpinViewer: View {
    let frames: [Data]
    var maxPixel = 1000

    @State private var images: [CGImage] = []
    @State private var index = 0
    @State private var dragStartIndex: Int?
    @State private var hintVisible = true

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                if images.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Image(cgImage: images[index % images.count])
                        .resizable().scaledToFit()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                if hintVisible && !images.isEmpty {
                    Label("좌우로 끌어서 돌려 보기", systemImage: "arrow.left.and.right")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 10).padding(.vertical, 5)
                        .background(.ultraThinMaterial, in: Capsule())
                        .transition(.opacity)
                }
            }
            .contentShape(Rectangle())
            .gesture(
                DragGesture(minimumDistance: 2)
                    .onChanged { value in
                        guard !images.isEmpty else { return }
                        if dragStartIndex == nil { dragStartIndex = index }
                        // 화면 폭만큼 끌면 한 바퀴
                        let step = max(geo.size.width / CGFloat(images.count), 4)
                        let delta = Int((-value.translation.width / step).rounded())
                        let n = images.count
                        index = (((dragStartIndex ?? 0) + delta) % n + n) % n
                        if hintVisible { withAnimation { hintVisible = false } }
                    }
                    .onEnded { _ in dragStartIndex = nil }
            )
        }
        .task(id: frames.count) {
            let frames = self.frames
            let max = maxPixel
            images = await Task.detached { frames.compactMap { ImageThumbnail.make(data: $0, maxPixel: max) } }.value
            index = 0
        }
    }
}

/// 카메라 대표 모습: 360° 사진 → 사진 한 장 → 기본 모형 순서
struct CameraCoverView: View {
    let camera: CameraItem
    /// true면 상세 화면처럼 직접 돌려 볼 수 있다
    var interactive = false
    /// 그냥 사진은 칸을 꽉 채운다
    var fill = false

    var body: some View {
        if interactive, camera.spinData != nil {
            SpinViewer(frames: camera.spinFrames)
        } else if let data = camera.coverImageData {
            let photoOnly = camera.spinData == nil
            GeometryReader { geo in
                CameraImageView(data: data, fill: fill)
                    .scaleEffect(photoOnly ? camera.photoScale : 1)
                    .offset(x: photoOnly ? camera.photoOffsetX * geo.size.width : 0,
                            y: photoOnly ? camera.photoOffsetY * geo.size.height : 0)
                    .frame(width: geo.size.width, height: geo.size.height)
            }
            .clipped()
        } else if interactive {
            DummyCamera3DView(id: camera.dummyModelID, colorHex: CameraBodyStyle.defaultColorHex)
        } else {
            DummyCameraImage(id: camera.dummyModelID, colorHex: CameraBodyStyle.defaultColorHex)
        }
    }
}

extension CameraItem {
    /// 카드 위쪽을 꽉 채워 보여 줄 사진 (배경 지운 PNG·360° 사진은 제외)
    var bleedsPhoto: Bool { spinData == nil && (photo.map { !$0.isCutoutPNG } ?? false) }
}

extension Color {
    /// "#RRGGBB"
    var hexString: String {
        let c = PlatformColor(self).rgb
        return String(format: "#%02X%02X%02X", Int((c.r * 255).rounded()), Int((c.g * 255).rounded()), Int((c.b * 255).rounded()))
    }
}

extension CameraItem {
    /// 기본 모형을 고르는 열쇠 (기종별 모양 → 없으면 형태별 기본형)
    var dummyModelID: DummyModelID { DummyModelID(brand: brand, model: model, style: bodyStyle) }
}
