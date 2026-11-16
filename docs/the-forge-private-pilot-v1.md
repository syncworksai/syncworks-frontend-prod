# The Forge — Private Performance Pilot v1

Owner pilot: jacoblord7@outlook.com only. Pilot route: /customer/forge.

## Aim
Personal operating system: daily schedule, athletic excellence, intellectual growth, presentation/style, family, wealth/income and calm reflection. Headphone-first, accessible mobile and desktop, low-pressure and realistic around childcare.

## Included in this PR
- An independently routed, owner-email-gated React screen
- Daily 4 AM aspirational timeline with completion checkboxes
- Daily intention field and local progress
- Six-pillar vision board with examples of daily actions
- Short narrated reflections using browser SpeechSynthesis (not Sync Assist or ElevenLabs)
- Bedtime target and rest-aware guidance
- Local browser storage scoped to email and date only

## NOT YET COMPLETE
- Backend-only authorization / true secure private account entitlements
- Cross-device persistence and secure server-side records
- Schedule editor and recurring events; time-zone and family-calendar synchronization
- Reminders, headphone sessions spanning an entire routine, audio state and playback controls
- AI-powered conversations or market forecasts, trading platform connections, wearables
- Style gallery with uploaded photos and personal wardrobe or shopping links
- Automatic grooming, workouts and meal planning from individualized baselines
- Notification permissions and quiet hours
- Comprehensive tests and verified production deployment

## Next implementation priorities
1. Backend owner-only entitlement and ForgeProfile/ForgeRoutine/ForgeCheckIn models; reject access server-side (not only hidden UI).
2. Connect read-only health data, current workout/sleep and calendar; add opt-in, privacy controls, export/delete.
3. Daily routine editor (duration, priority, dependencies, flexible buffers); rest-first constraints.
4. Sync Assist coaching sessions with explicit permissions, no trading execution.
5. Mobile headphone audio queue and reminders with silence/focus modes.
6. Automated tests for owner vs non-owner, midnight rollover, accessible keyboard navigation, storage and voice fallback.

## Product constraints
- Wake-up at 4 AM is aspirational, not required; maintain adequate sleep.
- Family time, sleep and recovery must not be traded for arbitrary streaks.
- Avoid guaranteeing wealth, fitness results or market predictions.
- Avoid auto-trading, financial advice, surveillance or externally-triggered messaging without explicit permission.
- No public checkout or monetization in v1.
