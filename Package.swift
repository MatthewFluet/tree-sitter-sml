// swift-tools-version:5.3

import Foundation
import PackageDescription

var sources = ["src/parser.c"]
if FileManager.default.fileExists(atPath: "src/scanner.c") {
    sources.append("src/scanner.c")
}

let package = Package(
    name: "TreeSitterSML",
    products: [
        .library(name: "TreeSitterSML", targets: ["TreeSitterSML"]),
    ],
    dependencies: [
        .package(url: "https://github.com/tree-sitter/swift-tree-sitter", from: "0.8.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterSML",
            dependencies: [],
            path: ".",
            sources: sources,
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterSMLTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterSML",
            ],
            path: "bindings/swift/TreeSitterSMLTests"
        )
    ],
    cLanguageStandard: .c11
)
