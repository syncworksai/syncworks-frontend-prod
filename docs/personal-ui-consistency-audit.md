# Personal UI consistency audit

## Standard Personal experience

- Satin-black and graphite surfaces
- White primary type with cyan, blue and restrained violet accents
- Rounded action-first cards
- Compact mobile typography and one-thumb controls
- Standard circular glowing `S` launcher from `src/components/sync/SyncLauncherButton.jsx`
- Health keeps its separate electric-green launcher and visual identity

## Current rollout

The Personal command center and complete SYNC briefing use the updated standard. Remaining Personal pages should adopt the shared launcher and surface treatment incrementally, without broad route or feature refactors.

## Rules

- Do not show unavailable role cards.
- Keep urgent actions above promotional cards.
- Keep Business, access-code and Affiliate promotion below daily attention content.
- Do not expose God Mode labels or controls to unauthorized users.
- Do not represent browser-local calendar data as cross-device persistence.
