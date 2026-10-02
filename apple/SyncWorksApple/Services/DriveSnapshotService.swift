import Foundation

protocol DriveSnapshotProviding {
    func loadSnapshot() async -> DriveSnapshot
}

struct DriveSnapshotService: DriveSnapshotProviding {
    let api: SyncWorksAPI

    init(api: SyncWorksAPI = .shared) {
        self.api = api
    }

    func loadSnapshot() async -> DriveSnapshot {
        async let events = loadEvents()
        async let messages = loadMessages()
        async let workItems = loadWorkItems()
        return await DriveSnapshot(events: events, messages: messages, workItems: workItems)
    }

    private func loadEvents() async -> [DriveEvent] {
        // TODO: replace with the exact Calendar endpoint once the native auth/session
        // handshake is wired. Keep CarPlay resilient: one failed source should not
        // blank the entire driving UI.
        return []
    }

    private func loadMessages() async -> [DriveMessage] {
        // TODO: map the existing SyncWorks inbox/conversation endpoint into this
        // deliberately small CarPlay-safe model.
        return []
    }

    private func loadWorkItems() async -> [DriveWorkItem] {
        // TODO: map tickets/requests/jobs into the next actionable driving item.
        return []
    }
}
