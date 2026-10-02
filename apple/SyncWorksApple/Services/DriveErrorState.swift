import Foundation

struct DriveErrorState: Hashable {
    let title: String
    let detail: String

    static let offline = DriveErrorState(
        title: "SYNC is offline",
        detail: "Reconnect when it is safe to continue."
    )
}
