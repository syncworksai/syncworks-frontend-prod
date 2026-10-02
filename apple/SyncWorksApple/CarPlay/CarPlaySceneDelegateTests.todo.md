# CarPlay V1 test checklist

- Launch iPhone host app without CarPlay attached.
- Attach CarPlay Simulator and verify four tabs render: Today, Messages, Next, SYNC.
- Verify empty states render without crashing when an API source fails.
- Verify tapping an item with an address hands off to Apple Maps.
- Verify account setup is not requested on the vehicle display.
- Verify reconnect/disconnect cycles clear stale driving data.
- Verify voice-based-conversation entitlement is not enabled in signing until Apple grants it.
- Verify all driver-facing copy remains short and no finance/health-detail screens are reachable from CarPlay.
