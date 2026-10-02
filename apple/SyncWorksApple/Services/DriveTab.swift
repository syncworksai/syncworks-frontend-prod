import Foundation

enum DriveTab: String, CaseIterable, Identifiable {
    case today = "Today"
    case messages = "Messages"
    case next = "Next"
    case sync = "SYNC"

    var id: String { rawValue }
}
