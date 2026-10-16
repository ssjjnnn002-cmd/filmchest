import Foundation
import CoreLocation
import FilmScanCore

/// 현재 위치와 동네 이름(예: "망원동")을 한 번 가져온다.
@Observable
final class LocationProvider {
    struct Place {
        let name: String
        let point: GeoPoint
        var weather: WeatherNote? = nil
    }

    var isLocating = false
    @ObservationIgnored private let manager = CLLocationManager()

    func currentPlace(timeout: Duration = .seconds(8)) async -> Place? {
        isLocating = true
        defer { isLocating = false }

        #if os(iOS)
        let session = CLServiceSession(authorization: .whenInUse)
        defer { session.invalidate() }
        #else
        manager.requestWhenInUseAuthorization()
        #endif

        let location: CLLocation? = await withTaskGroup(of: CLLocation?.self) { group in
            group.addTask {
                do {
                    for try await update in CLLocationUpdate.liveUpdates() {
                        if let loc = update.location, loc.horizontalAccuracy < 200 { return loc }
                        if update.authorizationDenied || update.authorizationDeniedGlobally { return nil }
                    }
                } catch {}
                return nil
            }
            group.addTask {
                try? await Task.sleep(for: timeout)
                return nil
            }
            let first = await group.next() ?? nil
            group.cancelAll()
            return first
        }
        guard let location else { return nil }

        let point = GeoPoint(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude,
                             altitude: location.verticalAccuracy > 0 ? location.altitude : nil)
        async let name = placeName(for: location)
        async let weather = Self.weather(at: point)
        return Place(name: await name ?? "", point: point, weather: await weather)
    }

    /// 그 자리의 지금 날씨 (Open-Meteo, 키 없이 무료). 못 받으면 nil
    static func weather(at point: GeoPoint) async -> WeatherNote? {
        var c = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        c.queryItems = [
            URLQueryItem(name: "latitude", value: String(point.latitude)),
            URLQueryItem(name: "longitude", value: String(point.longitude)),
            URLQueryItem(name: "current", value: "temperature_2m,weather_code"),
        ]
        guard let url = c.url else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 6
        struct Response: Decodable {
            struct Current: Decodable { let temperature_2m: Double; let weather_code: Int }
            let current: Current
        }
        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let r = try? JSONDecoder().decode(Response.self, from: data) else { return nil }
        return WeatherNote(code: r.current.weather_code, temperature: r.current.temperature_2m)
    }

    private func placeName(for location: CLLocation) async -> String? {
        let marks = try? await CLGeocoder().reverseGeocodeLocation(location, preferredLocale: Locale(identifier: "ko_KR"))
        guard let mark = marks?.first else { return nil }
        return mark.subLocality ?? mark.locality ?? mark.name
    }
}
