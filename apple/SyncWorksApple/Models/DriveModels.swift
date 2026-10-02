import Foundation

struct DriveEvent: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let startAt: Date?
    let locationName: String?
    let address: String?
    let status: String?
}

struct DriveMessage: Codable, Identifiable, Hashable {
    let id: String
    let senderName: String
    let preview: String
    let unread: Bool
}

struct DriveWorkItem: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let subtitle: String?
    let scheduledAt: Date?
    let address: String?
    let status: String?
}

struct DriveSnapshot: Codable, Hashable {
    var events: [DriveEvent]
    var messages: [DriveMessage]
    var workItems: [DriveWorkItem]

    static let empty = DriveSnapshot(events: [], messages: [], workItems: [])
}
