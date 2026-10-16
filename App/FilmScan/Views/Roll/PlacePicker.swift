import SwiftUI
import MapKit
import FilmScanCore

/// 지도 검색 자동완성
@Observable
final class PlaceSearch: NSObject, MKLocalSearchCompleterDelegate {
    var query = "" { didSet { completer.queryFragment = query } }
    var results: [MKLocalSearchCompletion] = []
    var isResolving = false

    @ObservationIgnored private let completer = MKLocalSearchCompleter()

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = [.pointOfInterest, .address]
    }

    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        results = Array(completer.results.prefix(8))
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        results = []
    }

    /// 자동완성 항목을 실제 좌표로 바꾼다
    func resolve(_ completion: MKLocalSearchCompletion) async -> LocationProvider.Place? {
        isResolving = true
        defer { isResolving = false }
        let response = try? await MKLocalSearch(request: MKLocalSearch.Request(completion: completion)).start()
        guard let item = response?.mapItems.first else { return nil }
        let c = item.placemark.coordinate
        return LocationProvider.Place(name: item.name ?? completion.title,
                                      point: GeoPoint(latitude: c.latitude, longitude: c.longitude))
    }
}

/// 장소 고르기: 검색 또는 현재 위치. 고른 장소는 지도로 확인한다.
struct PlacePickerSection: View {
    @Binding var name: String
    @Binding var point: GeoPoint?
    /// 현재 위치로 고르면 그 자리 날씨도 채운다 (검색한 장소면 비운다)
    var weather: Binding<WeatherNote?>? = nil

    @State private var search = PlaceSearch()
    @State private var location = LocationProvider()
    @State private var searching = false

    var body: some View {
        Section {
            if let point, !searching {
                VStack(alignment: .leading, spacing: 8) {
                    Label(name.isEmpty ? "선택한 위치" : name, systemImage: "mappin.circle.fill")
                        .font(.headline)
                        .foregroundStyle(Theme.safelight)
                    Map(initialPosition: .region(MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: point.latitude, longitude: point.longitude),
                        latitudinalMeters: 800, longitudinalMeters: 800))) {
                        Marker(name, coordinate: CLLocationCoordinate2D(latitude: point.latitude, longitude: point.longitude))
                            .tint(Theme.safelight)
                    }
                    .id("\(point.latitude),\(point.longitude)")
                    .frame(height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .allowsHitTesting(false)
                }
                Button("장소 바꾸기", systemImage: "magnifyingglass") { searching = true }
                if let w = weather?.wrappedValue {
                    Label(w.summary, systemImage: "cloud.sun")
                        .foregroundStyle(.secondary)
                }
                Button("장소 지우기", systemImage: "xmark.circle", role: .destructive) {
                    self.point = nil
                    name = ""
                    weather?.wrappedValue = nil
                }
            } else {
                HStack {
                    Image(systemName: "magnifyingglass").foregroundStyle(.secondary)
                    TextField("장소 검색", text: $search.query)
                        .autocorrectionDisabled()
                    if search.isResolving { ProgressView().controlSize(.small) }
                }
                ForEach(search.results, id: \.self) { result in
                    Button {
                        Task {
                            if let place = await search.resolve(result) {
                                name = place.name
                                point = place.point
                                weather?.wrappedValue = nil
                                searching = false
                                search.query = ""
                            }
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(result.title).foregroundStyle(.primary)
                            if !result.subtitle.isEmpty {
                                Text(result.subtitle).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                Button {
                    Task {
                        if let place = await location.currentPlace() {
                            name = place.name
                            point = place.point
                            weather?.wrappedValue = place.weather
                            searching = false
                        }
                    }
                } label: {
                    HStack {
                        Label(location.isLocating ? "현재 위치 찾는 중…" : "현재 위치", systemImage: "location.fill")
                        if location.isLocating { Spacer(); ProgressView().controlSize(.small) }
                    }
                }
                .disabled(location.isLocating)
                if point != nil {
                    Button("취소") { searching = false }
                }
            }
        } header: {
            Text("장소")
        } footer: {
            if point == nil {
                Text("검색하거나 현재 위치를 고르면 사진에 위치가 기록돼요.")
            }
        }
    }
}
