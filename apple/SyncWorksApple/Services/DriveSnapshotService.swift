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
        do {
            let token = try await CarPlayAuthSession.shared.load()
            await api.setBearerToken(token)
            let payload: DriveStatePayload = try await api.get("/sync-ai/assistant/drive-state/")

            let workItems = payload.requests.map { request in
                let provider = request.provider?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                let status = request.statusLabel?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                let subtitle = [status, provider]
                    .filter { !$0.isEmpty }
                    .joined(separator: " • ")
                return DriveWorkItem(
                    id: request.id,
                    title: request.title,
                    subtitle: subtitle.isEmpty ? nil : subtitle,
                    address: nil,
                    status: request.status
                )
            }

            return DriveSnapshot(
                events: payload.events,
                messages: payload.messages,
                workItems: workItems,
                unreadCount: payload.unreadCount,
                attention: payload.attention
            )
        } catch {
            // CarPlay must stay usable even if cellular coverage is poor or the
            // iPhone session expired. The host app handles re-authentication.
            return .empty
        }
    }
}
