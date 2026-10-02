import Foundation

struct DriveVoiceRequest: Codable, Hashable {
    let utterance: String
    let context: String?
}

struct DriveVoiceResponse: Codable, Hashable {
    let spokenText: String
    let action: String?
    let address: String?
}
