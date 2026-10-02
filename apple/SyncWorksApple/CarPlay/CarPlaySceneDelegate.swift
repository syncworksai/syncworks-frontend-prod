import CarPlay
import Foundation
import MapKit
import UIKit

final class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    private var interfaceController: CPInterfaceController?
    private let snapshotService: DriveSnapshotProviding = DriveSnapshotService()
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
        tabs.title = "SYNC Drive"
        interfaceController?.setRootTemplate(tabs, animated: true, completion: nil)
    }

    private func makeTodayTemplate() -> CPListTemplate {
        let rows: [CPListItem]
        if snapshot.events.isEmpty {
            rows = [CPListItem(text: "No upcoming items", detailText: "Your day is clear in SyncWorks")]
        } else {
            rows = snapshot.events.prefix(6).map { event in
                let item = CPListItem(text: event.title, detailText: eventDetail(event))
                item.handler = { [weak self] _, completion in
                    self?.openMaps(address: event.address)
                    completion()
                }
                return item
            }
        }
        return CPListTemplate(title: "Today", sections: [CPListSection(items: rows)])
    }

    private func makeMessagesTemplate() -> CPListTemplate {
        let rows: [CPListItem]
        if snapshot.messages.isEmpty {
            rows = [CPListItem(text: "No new messages", detailText: "SYNC will surface important conversations here")]
        } else {
            rows = snapshot.messages.prefix(6).map { message in
                CPListItem(
                    text: message.senderName,
                    detailText: message.preview
                )
            }
        }
        return CPListTemplate(title: "Messages", sections: [CPListSection(items: rows)])
    }

    private func makeWorkTemplate() -> CPListTemplate {
        let rows: [CPListItem]
        if snapshot.workItems.isEmpty {
            rows = [CPListItem(text: "No next job", detailText: "Jobs and service requests will appear here")]
        } else {
            rows = snapshot.workItems.prefix(6).map { work in
                let item = CPListItem(text: work.title, detailText: work.subtitle ?? work.status)
                item.handler = { [weak self] _, completion in
                    self?.openMaps(address: work.address)
                    completion()
                }
                return item
            }
        }
        return CPListTemplate(title: "Next", sections: [CPListSection(items: rows)])
    }

    private func makeSyncTemplate() -> CPListTemplate {
        let sync = CPListItem(
            text: "Talk to SYNC",
            detailText: "Ask about your day, messages, schedule, or next stop"
        )
        sync.handler = { [weak self] _, completion in
            self?.showVoiceInfo()
            completion()
        }
        return CPListTemplate(title: "SYNC", sections: [CPListSection(items: [sync])])
    }

    private func eventDetail(_ event: DriveEvent) -> String? {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        formatter.dateStyle = .none
        var pieces: [String] = []
        if let startAt = event.startAt { pieces.append(formatter.string(from: startAt)) }
        if let locationName = event.locationName, !locationName.isEmpty { pieces.append(locationName) }
        return pieces.isEmpty ? event.status : pieces.joined(separator: " • ")
    }

    private func openMaps(address: String?) {
        guard let address, !address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let item = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: 0, longitude: 0)))
        item.name = address
        let encoded = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? address
        if let url = URL(string: "http://maps.apple.com/?q=\(encoded)") {
            UIApplication.shared.open(url)
        }
    }

    private func showVoiceInfo() {
        let alert = CPAlertTemplate(
            titleVariants: ["SYNC voice is ready for native intent wiring"],
            actions: [CPAlertAction(title: "OK", style: .default, handler: { _ in })]
        )
        interfaceController?.presentTemplate(alert, animated: true, completion: nil)
    }
}
