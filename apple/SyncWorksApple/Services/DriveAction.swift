import Foundation

enum DriveAction: Hashable {
    case refresh
    case openNavigation(address: String)
    case readMessages
    case nextItem
    case talkToSync
}
