import Foundation

struct DriveEvent: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let startAt: Date?
    let endAt: Date?
    let locationName: String?
    let address: String?

    enum CodingKeys: String, CodingKey {
        case id, title, address
        case startAt = "start_at"
        case endAt = "end_at"
        case locationName = "location"
    }
}

struct DriveMessage: Codable, Identifiable, Hashable {
    let id: Int
    let title: String
    let provider: String?
    let status: String?
    let latestMessage: String?
    let latestMessageAt: Date?
    let unread: Bool
    let needsAttention: Bool

    var displayTitle: String {
        let cleanProvider = provider?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return cleanProvider.isEmpty ? title : cleanProvider
    }

    enum CodingKeys: String, CodingKey {
        case id, title, provider, status, unread
        case latestMessage = "latest_message"
        case latestMessageAt = "latest_message_at"
        case needsAttention = "needs_attention"
    }
}

struct DriveRequest: Codable, Identifiable, Hashable {
    let id: Int
    let code: String?
    let title: String
    let status: String?
    let statusLabel: String?
    let provider: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, code, title, status, provider
        case statusLabel = "status_label"
        case createdAt = "created_at"
    }
}

struct DriveAttentionItem: Codable, Hashable {
    let category: String
    let priority: String
    let title: String
    let detail: String
}

struct DriveStatePayload: Codable, Hashable {
    let localDate: String?
    let generatedAt: Date?
    let events: [DriveEvent]
    let nextEvent: DriveEvent?
    let messages: [DriveMessage]
    let unreadCount: Int
    let requests: [DriveRequest]
    let attention: [DriveAttentionItem]

    enum CodingKeys: String, CodingKey {
        case events, messages, requests, attention
        case localDate = "local_date"
        case generatedAt = "generated_at"
        case nextEvent = "next_event"
        case unreadCount = "unread_count"
    }
}

struct DriveWorkItem: Identifiable, Hashable {
    let id: Int
    let title: String
    let subtitle: String?
    let address: String?
    let status: String?
}

struct DriveSnapshot: Hashable {
    var events: [DriveEvent]
    var messages: [DriveMessage]
    var workItems: [DriveWorkItem]
    var unreadCount: Int
    var attention: [DriveAttentionItem]

    static let empty = DriveSnapshot(
        events: [],
        messages: [],
        workItems: [],
        unreadCount: 0,
        attention: []
    )
}
