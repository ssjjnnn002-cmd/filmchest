// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "FilmScanCore",
    platforms: [.macOS(.v14), .iOS(.v17)],
    products: [
        .library(name: "FilmScanCore", targets: ["FilmScanCore"]),
        .executable(name: "filmscan", targets: ["filmscan"]),
    ],
    targets: [
        .target(name: "FilmScanCore"),
        .executableTarget(name: "filmscan", dependencies: ["FilmScanCore"]),
        .testTarget(name: "FilmScanCoreTests", dependencies: ["FilmScanCore"]),
    ]
)
