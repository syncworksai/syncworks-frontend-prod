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
    var body: some View {
        NavigationStack {
            List {
                Section("SYNC Drive") {
                    Label("CarPlay foundation installed", systemImage: "car.fill")
                    Text("Sign in and setup stay on iPhone. The vehicle display remains driver-safe and voice-first.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("SyncWorks")
        }
    }
}
