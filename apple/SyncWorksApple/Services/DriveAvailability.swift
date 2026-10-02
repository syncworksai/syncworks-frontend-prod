import Foundation

struct DriveAvailability: Hashable {
    var isAuthenticated: Bool
    var isOnline: Bool

    static let unavailable = DriveAvailability(isAuthenticated: false, isOnline: false)
}
