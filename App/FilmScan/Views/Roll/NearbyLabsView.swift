import SwiftUI
import MapKit
import FilmScanCore

/// 가까운 현상소: 지도 + 거리순 목록. 고르면 현상소 이름이 채워진다.
/// 카카오 검색(서버 함수 /api/labs)을 먼저 쓰고, 키가 없거나 실패하면 애플 지도 검색으로 찾는다.
struct NearbyLabsView: View {
    var onPick: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var location = LocationProvider()
    @State private var here: GeoPoint?
    @State private var labs: [Lab] = []
    @State private var loading = true
    @State private var failed = false
    @State private var selected: Lab.ID?
    @State private var camera: MapCameraPosition = .automatic

    struct Lab: Identifiable, Hashable {
        let id: String
        let name: String
        let address: String
        let phone: String?
        let coordinate: CLLocationCoordinate2D
        let distance: Double
        let url: URL?

        static func == (a: Lab, b: Lab) -> Bool { a.id == b.id }
        func hash(into h: inout Hasher) { h.combine(id) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Map(position: $camera, selection: $selected) {
                    UserAnnotation()
                    ForEach(labs) { lab in
                        Marker(lab.name, systemImage: "camera.fill", coordinate: lab.coordinate)
                            .tint(Theme.safelight)
                            .tag(lab.id)
                    }
                }
                .frame(height: 300)
                .overlay {
                    if loading { ProgressView("현상소 찾는 중…").padding().background(.regularMaterial, in: .rect(cornerRadius: 12)) }
                }

                List {
                    if !loading && labs.isEmpty {
                        Text(failed ? "현재 위치를 알 수 없어요. 위치 권한을 확인해 주세요." : "근처에서 현상소를 찾지 못했어요.")
                            .foregroundStyle(.secondary)
                    }
                    Section(labs.isEmpty ? "" : "이 근처 현상소 \(labs.count)곳") {
                        ForEach(labs) { lab in
                            Button {
                                onPick(lab.name)
                                dismiss()
                            } label: {
                                HStack(alignment: .top, spacing: 12) {
                                    Image(systemName: "camera.fill")
                                        .foregroundStyle(Theme.safelight)
                                        .frame(width: 32, height: 32)
                                        .background(Theme.safelight.opacity(0.12), in: .rect(cornerRadius: 8))
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(lab.name).foregroundStyle(.primary)
                                        Text([Self.distanceText(lab.distance), lab.address].filter { !$0.isEmpty }.joined(separator: " · "))
                                            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                    }
                                    Spacer()
                                    if let url = lab.url {
                                        Button("정보", systemImage: "info.circle") { openURL(url) }
                                            .labelStyle(.iconOnly)
                                            .buttonStyle(.borderless)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                            .contentShape(Rectangle())
                            .listRowBackground(selected == lab.id ? Theme.safelight.opacity(0.08) : nil)
                        }
                    }
                }
            }
            .navigationTitle("가까운 현상소")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("닫기") { dismiss() } }
            }
            .onChange(of: selected) { _, id in
                guard let lab = labs.first(where: { $0.id == id }) else { return }
                withAnimation { camera = .region(MKCoordinateRegion(center: lab.coordinate, latitudinalMeters: 1200, longitudinalMeters: 1200)) }
            }
            .task { await load() }
        }
        #if os(macOS)
        .frame(minWidth: 460, minHeight: 640)
        #endif
    }

    private func load() async {
        defer { loading = false }
        guard let place = await location.currentPlace() else { failed = true; return }
        here = place.point
        let found = await Self.kakao(near: place.point)
        labs = found.isEmpty ? await Self.appleMaps(near: place.point) : found
    }

    static func distanceText(_ m: Double) -> String {
        m < 1000 ? "\(Int(m))m" : String(format: "%.1fkm", m / 1000)
    }

    /// 카카오 로컬 검색 (필름함 서버를 거친다)
    static func kakao(near p: GeoPoint) async -> [Lab] {
        guard let url = URL(string: "https://filmchest.vercel.app/api/labs?lat=\(p.latitude)&lng=\(p.longitude)") else { return [] }
        struct Response: Decodable {
            struct Item: Decodable {
                let name: String; let address: String?; let phone: String?
                let latitude: Double; let longitude: Double; let distance: Double?; let url: String?
            }
            let labs: [Item]
        }
        guard let (data, response) = try? await URLSession.shared.data(from: url),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let r = try? JSONDecoder().decode(Response.self, from: data) else { return [] }
        let here = CLLocation(latitude: p.latitude, longitude: p.longitude)
        return r.labs.map { i in
            Lab(id: "\(i.name)|\(i.latitude)|\(i.longitude)", name: i.name, address: i.address ?? "", phone: i.phone,
                coordinate: CLLocationCoordinate2D(latitude: i.latitude, longitude: i.longitude),
                distance: i.distance ?? here.distance(from: CLLocation(latitude: i.latitude, longitude: i.longitude)),
                url: i.url.flatMap(URL.init(string:)))
        }
    }

    /// 애플 지도 검색 (키 없이). 국내는 빠지는 곳이 있을 수 있다
    static func appleMaps(near p: GeoPoint) async -> [Lab] {
        let center = CLLocationCoordinate2D(latitude: p.latitude, longitude: p.longitude)
        let here = CLLocation(latitude: p.latitude, longitude: p.longitude)
        var seen = Set<String>(), out: [Lab] = []
        for q in ["필름 현상", "필름 현상소", "film lab"] {
            let request = MKLocalSearch.Request()
            request.naturalLanguageQuery = q
            request.region = MKCoordinateRegion(center: center, latitudinalMeters: 20_000, longitudinalMeters: 20_000)
            guard let items = try? await MKLocalSearch(request: request).start().mapItems else { continue }
            for item in items {
                let c = item.placemark.coordinate
                let id = "\(item.name ?? "")|\(c.latitude)|\(c.longitude)"
                guard seen.insert(id).inserted else { continue }
                out.append(Lab(id: id, name: item.name ?? "현상소", address: item.placemark.title ?? "", phone: item.phoneNumber,
                               coordinate: c, distance: here.distance(from: CLLocation(latitude: c.latitude, longitude: c.longitude)),
                               url: item.url))
            }
        }
        // 20km 안만, 이름에 필름·현상이 들어간 곳을 먼저
        return out.filter { $0.distance <= 20_000 }.sorted {
            let a = isFilmLab($0.name), b = isFilmLab($1.name)
            return a != b ? a : $0.distance < $1.distance
        }
    }

    static func isFilmLab(_ name: String) -> Bool {
        name.range(of: #"필름|현상|film|lab|랩"#, options: [.regularExpression, .caseInsensitive]) != nil
    }
}
