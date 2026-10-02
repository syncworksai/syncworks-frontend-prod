import Foundation

struct NativeLoginRequest: Encodable {
    let identifier: String
    let password: String
}

struct NativeLoginResponse: Decodable {
    let token: String
}

actor NativeAuthService {
    static let shared = NativeAuthService()

    private let api: SyncWorksAPI
    private let session: CarPlayAuthSession

    init(api: SyncWorksAPI = .shared, session: CarPlayAuthSession = .shared) {
        self.api = api
        self.session = session
    }

    func isSignedIn() async -> Bool {
        guard let token = try? await session.load() else { return false }
        return !(token?.isEmpty ?? true)
    }

    func signIn(identifier: String, password: String) async throws {
        let cleanIdentifier = identifier.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanIdentifier.isEmpty, !password.isEmpty else {
            throw NativeAuthError.missingCredentials
        }

        let response: NativeLoginResponse = try await api.post(
            "/auth/login/",
            body: NativeLoginRequest(identifier: cleanIdentifier, password: password)
        )
        guard !response.token.isEmpty else {
            throw NativeAuthError.missingToken
        }

        try await session.save(accessToken: response.token)
        await api.setBearerToken(response.token)
    }

    func signOut() async {
        await session.clear()
        await api.setBearerToken(nil)
    }
}

enum NativeAuthError: Error, LocalizedError {
    case missingCredentials
    case missingToken

    var errorDescription: String? {
        switch self {
        case .missingCredentials:
            return "Email or username and password are required."
        case .missingToken:
            return "SyncWorks did not return an authentication token."
        }
    }
}
