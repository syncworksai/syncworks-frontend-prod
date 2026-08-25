# SyncWorks Mobile PWA Production Audit

## Objective

Keep every installed iPhone/Home Screen screen, drawer, modal, sticky header, fixed toolbar, and bottom navigation inside the iOS safe areas so system UI never blocks controls.

## Production shell rules

- Top app content must honor a shared safe-area variable instead of page-specific offsets.
- Sticky headers must stop below the iOS status bar.
- Fixed full-screen overlays must begin below the iOS status bar and end above the Home indicator.
- Fixed top controls must use the shared safe top.
- Fixed bottom controls and navigation must use the shared safe bottom.
- Drawers and modals must keep their close controls inside the safe viewport.
- The app shell must support installed Home Screen mode even when iOS reports a zero safe-area inset.
- Individual pages should not add their own standalone-mode top spacing unless there is a documented exception.

## Surfaces covered by the global shell

- Login and registration
- Personal dashboard and Personal tools
- Business dashboard and Business tools
- Property Management
- Employee
- Tenant and Investor portals
- Calendar and Inbox
- Health
- Finance
- SYNC Assistant
- Platform / God Mode
- ModeBar mobile menu
- Create Business drawer
- Full-screen fixed drawers and modals using Tailwind `fixed inset-0`
- Fixed top and bottom controls using Tailwind positioning utilities

## Regression checks before production

1. Launch from iPhone Home Screen, not Safari.
2. Confirm ModeBar logo, inbox, and menu are fully below the status bar.
3. Open the ModeBar menu and verify Close is fully visible and tappable.
4. Open nested drawers/modals and confirm their close/back controls remain visible.
5. Navigate through Personal, Business, PM, Health, Finance, Calendar, Inbox, and SYNC.
6. Confirm bottom navigation remains above the Home indicator.
7. Rotate once to landscape and back to portrait.
8. Background the app and reopen it; confirm no header jumps under the status bar.
9. Test on a normal Safari tab to confirm the standalone-only safe-area fallback does not alter browser layout.

## Rule for future UI work

Any new drawer or full-screen modal should use the shared app shell and normal fixed positioning. Do not hard-code an iPhone notch offset inside an individual page. The global PWA safe-area layer is responsible for keeping all fixed/sticky surfaces tappable.