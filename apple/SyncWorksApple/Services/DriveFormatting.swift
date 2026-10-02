import Foundation

enum DriveFormatting {
    static let time: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter
    }()

    static func compact(parts: [String?]) -> String? {
        let values = parts.compactMap { value -> String? in
            guard let value else { return nil }
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        return values.isEmpty ? nil : values.joined(separator: " • ")
    }
}
