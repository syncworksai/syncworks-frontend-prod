import Foundation

struct DriveRefreshPolicy {
    let minimumInterval: TimeInterval

    init(minimumInterval: TimeInterval = 30) {
        self.minimumInterval = minimumInterval
    }

    func shouldRefresh(lastRefresh: Date?, now: Date = Date()) -> Bool {
        guard let lastRefresh else { return true }
        return now.timeIntervalSince(lastRefresh) >= minimumInterval
    }
}
