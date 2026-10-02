import Foundation

actor SyncWorksAPI {
    static let shared = SyncWorksAPI()

    // Keep this aligned with the production API used by the web app.
    // Staging builds should override it through an xcconfig or build setting.
    var baseURL = URL(string: "https://syncworks-api.onrender.com")!

    private let session: URLSession
    private let decoder: JSONDecoder
    private var bearerToken: String?

    init(session: URLSession = .shared) {
        self.session = session
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder
    }

    func setBearerToken(_ token: String?) {
        bearerToken = token
    }

    func get<T: Decodable>(_ path: String, as type: T.Type = T.self) async throws -> T {
        let url = try makeURL(path)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let bearerToken, !bearerToken.isEmpty {
            request.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.httpStatus(http.statusCode)
        }
        return try decoder.decode(T.self, from: data)
    }

    private func makeURL(_ path: String) throws -> URL {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else {
            throw APIError.invalidURL(path)
        }
        return url
    }
}

enum APIError: Error, LocalizedError {
    case invalidURL(String)
    case invalidResponse
    case httpStatus(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL(let path): return "Invalid SyncWorks API path: \(path)"
        case .invalidResponse: return "SyncWorks API returned an invalid response."
        case .httpStatus(let code): return "SyncWorks API request failed with HTTP \(code)."
        }
    }
}
