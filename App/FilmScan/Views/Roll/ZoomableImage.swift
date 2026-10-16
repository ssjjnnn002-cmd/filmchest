import SwiftUI

/// 두 손가락으로 확대/이동, 두 번 탭하면 확대/원래대로. (Mac은 트랙패드 확대/스크롤)
struct ZoomableImage: View {
    let image: CGImage
    var maxScale: CGFloat = 8

    var body: some View {
        ZoomHost(image: image, maxScale: maxScale)
    }
}

#if os(iOS)
private struct ZoomHost: UIViewRepresentable {
    let image: CGImage
    let maxScale: CGFloat

    func makeUIView(context: Context) -> ZoomScrollView {
        let view = ZoomScrollView()
        view.maxScale = maxScale
        view.set(UIImage(cgImage: image))
        return view
    }

    func updateUIView(_ view: ZoomScrollView, context: Context) {
        if view.imageView.image?.cgImage !== image { view.set(UIImage(cgImage: image)) }
    }
}

final class ZoomScrollView: UIScrollView, UIScrollViewDelegate {
    let imageView = UIImageView()
    var maxScale: CGFloat = 8
    private var lastSize: CGSize = .zero

    override init(frame: CGRect) {
        super.init(frame: frame)
        delegate = self
        showsVerticalScrollIndicator = false
        showsHorizontalScrollIndicator = false
        decelerationRate = .fast
        contentInsetAdjustmentBehavior = .never
        addSubview(imageView)
        let doubleTap = UITapGestureRecognizer(target: self, action: #selector(doubleTapped(_:)))
        doubleTap.numberOfTapsRequired = 2
        addGestureRecognizer(doubleTap)
    }

    required init?(coder: NSCoder) { fatalError() }

    func set(_ image: UIImage) {
        // 확대 상태에서 프레임을 바꾸면 크기 계산이 어긋나므로 먼저 1배로 되돌린다
        minimumZoomScale = 1
        maximumZoomScale = 1
        zoomScale = 1
        imageView.image = image
        imageView.frame = CGRect(origin: .zero, size: image.size)
        contentSize = image.size
        lastSize = .zero
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        guard let image = imageView.image, bounds.width > 0 else { return }
        if bounds.size != lastSize {
            lastSize = bounds.size
            let fit = min(bounds.width / image.size.width, bounds.height / image.size.height)
            minimumZoomScale = fit
            maximumZoomScale = max(fit * maxScale, 1)
            zoomScale = fit
        }
        center()
    }

    private func center() {
        let dx = max(0, (bounds.width - contentSize.width) / 2)
        let dy = max(0, (bounds.height - contentSize.height) / 2)
        contentInset = UIEdgeInsets(top: dy, left: dx, bottom: dy, right: dx)
    }

    func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }
    func scrollViewDidZoom(_ scrollView: UIScrollView) { center() }

    @objc private func doubleTapped(_ g: UITapGestureRecognizer) {
        if zoomScale > minimumZoomScale * 1.05 {
            setZoomScale(minimumZoomScale, animated: true)
        } else {
            let p = g.location(in: imageView)
            let scale = minimumZoomScale * 3
            let size = CGSize(width: bounds.width / scale, height: bounds.height / scale)
            zoom(to: CGRect(x: p.x - size.width / 2, y: p.y - size.height / 2, width: size.width, height: size.height), animated: true)
        }
    }
}
#else
private struct ZoomHost: NSViewRepresentable {
    let image: CGImage
    let maxScale: CGFloat

    func makeNSView(context: Context) -> NSScrollView {
        let scroll = NSScrollView()
        scroll.allowsMagnification = true
        scroll.hasVerticalScroller = true
        scroll.hasHorizontalScroller = true
        scroll.backgroundColor = .clear
        scroll.drawsBackground = false
        set(image, in: scroll)
        return scroll
    }

    func updateNSView(_ scroll: NSScrollView, context: Context) {
        if (scroll.documentView as? NSImageView)?.image?.cgImage(forProposedRect: nil, context: nil, hints: nil) !== image {
            set(image, in: scroll)
        }
    }

    private func set(_ image: CGImage, in scroll: NSScrollView) {
        let size = NSSize(width: image.width, height: image.height)
        let view = NSImageView(frame: NSRect(origin: .zero, size: size))
        view.image = NSImage(cgImage: image, size: size)
        view.imageScaling = .scaleProportionallyUpOrDown
        scroll.documentView = view
        DispatchQueue.main.async {
            let fit = min(scroll.bounds.width / size.width, scroll.bounds.height / size.height)
            scroll.minMagnification = fit
            scroll.maxMagnification = max(fit * maxScale, 1)
            scroll.magnification = fit
        }
    }
}
#endif
