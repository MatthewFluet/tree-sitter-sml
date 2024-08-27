import XCTest
import SwiftTreeSitter
import TreeSitterSML

final class TreeSitterSMLTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_sml())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading SML grammar")
    }
}
