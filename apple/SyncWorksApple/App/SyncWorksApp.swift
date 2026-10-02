import SwiftUI

@main
struct SyncWorksApp: App {
    var body: some Scene {
        WindowGroup {
            AppleClientHomeView()
        }
    }
}

struct AppleClientHomeView: View {
    @State private var identifier = ""
    @State private var password = ""
    @State private var signedIn = false
    @State private var loading = true
    @State private var statusMessage = ""
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            Form {
                Section("SYNC Drive") {
                    Label(
                        signedIn ? "CarPlay account connected" : "Connect your SyncWorks account",
                        systemImage: signedIn ? "car.fill" : "car"
                    )

                    Text("Setup and sign-in happen on iPhone. The vehicle display stays driver-safe and voice-first.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if loading {
                    Section {
                        ProgressView("Checking saved SyncWorks session…")
                    }
                } else if signedIn {
                    signedInControls
                } else {
                    signInControls
                }

                if !statusMessage.isEmpty {
                    Section("Status") {
                        Text(statusMessage)
                            .font(.footnote)
                    }
                }
            }
            .navigationTitle("SyncWorks")
            .task {
                signedIn = await NativeAuthService.shared.isSignedIn()
                loading = false
            }
        }
    }

    private var signInControls: some View {
        Section("Sign in") {
            TextField("Email or username", text: $identifier)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textContentType(.username)

            SecureField("Password", text: $password)
                .textContentType(.password)

            Button {
                signIn()
            } label: {
                if isWorking {
                    ProgressView()
                } else {
                    Text("Sign in for CarPlay")
                }
            }
            .disabled(isWorking || identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty)
        }
    }

    private var signedInControls: some View {
        Section("CarPlay") {
            Button("Test SYNC Drive connection") {
                testDriveConnection()
            }
            .disabled(isWorking)

            Button("Sign out", role: .destructive) {
                Task { @MainActor in
                    await NativeAuthService.shared.signOut()
                    signedIn = false
                    password = ""
                    statusMessage = "SyncWorks was disconnected from this iPhone."
                }
            }
        }
    }

    private func signIn() {
        isWorking = true
        statusMessage = ""
        Task { @MainActor in
            defer { isWorking = false }
            do {
                try await NativeAuthService.shared.signIn(identifier: identifier, password: password)
                signedIn = true
                password = ""
                statusMessage = "Connected. SYNC Drive can now use your driver-safe SyncWorks data when CarPlay is available."
            } catch {
                statusMessage = error.localizedDescription
            }
        }
    }

    private func testDriveConnection() {
        isWorking = true
        statusMessage = ""
        Task { @MainActor in
            defer { isWorking = false }
            let snapshot = await DriveSnapshotService().loadSnapshot()
            statusMessage = "SYNC Drive loaded \(snapshot.events.count) event(s), \(snapshot.messages.count) message(s), and \(snapshot.workItems.count) request(s)."
        }
    }
}
