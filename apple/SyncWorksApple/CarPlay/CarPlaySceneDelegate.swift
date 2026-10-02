import CarPlay
import Foundation
import UIKit

final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?
    private let snapshotService: DriveSnapshotProviding = DriveSnapshotService()
    private let maps = AppleMapsNavigator()
    private var snapshot: DriveSnapshot = .empty

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        Task { @MainActor in
            await refreshRootTemplate()
        }
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = nil
        snapshot = .empty
    }

    @MainActor
    private func refreshRootTemplate() async {
        snapshot = await snapshotService.loadSnapshot()
        let tabs = CPTabBarTemplate(templates: [
            makeTodayTemplate(),
            makeMessagesTemplate(),
            makeWorkTemplate(),
            makeSyncTemplate()
        ])
        interfaceController?.setRootTemplate(tabs, animated: true, completion: nil)
    }

    private func makeTodayTemplate() -> CPListTemplate {
        let rows: [CPListItem]
        if snapshot.events.isEmpty {
            rows = [CPListItem(text: "No upcoming items", detailText: "Your day is clear in SyncWorks")]
        } else {
            rows = snapshot.events.prefix(DriveConstants.maximumVisibleItems).map { event in
                let item = CPListItem(text: event.title, detailText: eventDetail(event))
                item.handler = { [weak self] _, completion in
                    self?.maps.open(address: event.address)
                    completion()
                }
                return item
            }
        }

        let template = CPListTemplate(title: "Today", sections: [CPListSection(items: rows)])
        template.tabTitle = "Today"
        template.tabImage = UIImage(systemName: "calendar")
        return template
    }

    private func makeMessagesTemplate() -> CPListTemplate {
        let rows: [CPListItem]
        if snapshot.messages.isEmpty {
            rows = [CPListItem(text: "No new messages", detailText: "SYNC will surface important conversations here")]
        } else {
            rows = snapshot.messages.prefix(DriveConstants.maximumVisibleItems).map { message in
                let detail = DriveFormatting.compact(parts: [
                    message.status,
                    message.latestMessage
                ])
                return CPListItem(text: message.displayTitle, detailText: detail)
            }
        }

        let title = snapshot.unreadCount > 0 ? "Messages (\(snapshot.unreadCount))" : "Messages"
        let template = CPListTemplate(title: title, sections: [CPListSection(items: rows)])
        template.tabTitle = "Messages"
        template.tabImage = UIImage(systemName: "message.fill")
        return template
    }

    private func makeWorkTemplate() -> CPListTemplate {
        let rows: [CPListItem]
        if snapshot.workItems.isEmpty {
            rows = [CPListItem(text: "No open requests", detailText: "Jobs and service requests will appear here")]
        } else {
            rows = snapshot.workItems.prefix(DriveConstants.maximumVisibleItems).map { work in
                let item = CPListItem(text: work.title, detailText: work.subtitle ?? work.status)
                item.handler = { [weak self] _, completion in
                    self?.maps.open(address: work.address)
                    completion()
                }
                return item
            }
        }

        let template = CPListTemplate(title: "Next", sections: [CPListSection(items: rows)])
        template.tabTitle = "Next"
        template.tabImage = UIImage(systemName: "location.fill")
        return template
    }

    private func makeSyncTemplate() -> CPListTemplate {
        let rows: [CPListItem]
        if let attention = snapshot.attention.first {
            let next = CPListItem(text: attention.title, detailText: attention.detail)
            rows = [next, makeTalkToSyncItem()]
        } else {
            rows = [makeTalkToSyncItem()]
        }

        let template = CPListTemplate(title: "SYNC", sections: [CPListSection(items: rows)])
        template.tabTitle = "SYNC"
        template.tabImage = UIImage(systemName: "waveform")
        return template
    }

    private func makeTalkToSyncItem() -> CPListItem {
        let sync = CPListItem(
            text: "Talk to SYNC",
            detailText: "Ask about your day, messages, schedule, or next stop"
        )
        sync.handler = { [weak self] _, completion in
            self?.showVoiceInfo()
            completion()
        }
        return sync
    }

    private func eventDetail(_ event: DriveEvent) -> String? {
        DriveFormatting.compact(parts: [
            event.startAt.map { DriveFormatting.time.string(from: $0) },
            event.locationName
        ])
    }

    private func showVoiceInfo() {
        let alert = CPAlertTemplate(
            titleVariants: ["SYNC voice setup is ready for the CarPlay entitlement build"],
            actions: [CPAlertAction(title: "OK", style: .default, handler: { _ in })]
        )
        interfaceController?.presentTemplate(alert, animated: true, completion: nil)
    }
}
