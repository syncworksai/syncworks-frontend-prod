# SyncWorks Apple Client

Native Apple surfaces for SyncWorks live here. The existing React/Vite web app remains the primary web client and continues to use the existing Django REST API.

## CarPlay V1

The first native target is **SYNC Drive**, a deliberately small CarPlay experience focused on driver-safe, glanceable actions:

- Today / next event
- Messages
- Next job or request
- Navigation handoff
- SYNC voice entry

The CarPlay UI must use Apple's CarPlay templates rather than mirroring the web dashboard.

## Apple requirement

A production CarPlay build requires Apple approval for the appropriate managed CarPlay entitlement. For this product direction, request the **Voice-Based Conversation** category (`com.apple.developer.carplay-voice-based-conversation`). Keep the entitlement disabled in local/project signing until Apple enables the managed capability on the developer account.

## Local development

1. Open/create the iOS project in Xcode on macOS.
2. Add the Swift files under `apple/SyncWorksApple/` to the iOS target.
3. Add a CarPlay scene configuration using `CPTemplateApplicationScene` and `CarPlaySceneDelegate`.
4. Point `SyncWorksAPI.baseURL` at the production or staging API.
5. Authenticate on iPhone before connecting CarPlay.
6. In Simulator choose **I/O > External Displays > CarPlay**.

## Safety rules for SYNC Drive

- No dense dashboard views.
- No finance balances, debt-editing, health detail, long forms, or free-form browsing while driving.
- Prefer voice and short lists.
- Navigation actions hand off to Apple Maps.
- Account setup and authentication happen on iPhone, not on the vehicle display.
