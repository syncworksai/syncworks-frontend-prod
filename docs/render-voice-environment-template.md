# Render voice environment template

Use the exact environment-variable names already consumed by the backend voice implementation. Do not add any ElevenLabs key to Vercel or a `VITE_` variable.

Expected configuration concepts:

- ElevenLabs API key: secret value stored only on Render
- Approved SYNC voice ID
- ElevenLabs model ID, when supported by the backend
- MP3 output format suitable for mobile Safari and Chrome

After saving environment changes, redeploy the backend and verify `/api/v1/sync-ai/voice/status/` reports the voice service as configured. Never commit or share the secret values.
