import Foundation
import UIKit

struct AppleMapsNavigator {
    func open(address: String?) {
        guard let address else { return }
        let trimmed = address.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        var components = URLComponents(string: "https://maps.apple.com/")
        components?.queryItems = [URLQueryItem(name: "q", value: trimmed)]
        guard let url = components?.url else { return }
        UIApplication.shared.open(url)
    }
}
