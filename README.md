# TwisWua Survival

A browser roguelite built with Next.js, React, TypeScript, and Canvas 2D. The game artwork is drawn in code.

## Run locally

Use Node.js 22.18+ (Node.js 24 recommended).

```sh
npm install
npm run dev
```

Open http://localhost:3000.

## Play

- On mobile, the game fills one screen: arena above, handheld controls below. Hold the left joystick to move; release to stop. Use A to dash (3-second cooldown) and B to roar (6-second cooldown).
- On desktop, move your mouse inside the arena, or use arrow keys / WASD. J dashes and K roars.
- Claws automatically attack ducks within range. Avoid touching enemies. From wave 5 onward, red-ringed shooting ducks keep their distance and fire aimed projectiles; their beaks flash before firing.
- Defeat every duck to finish a wave and choose one of three random powerups. The eight-powerup pool includes damage, attack speed, health, claw reach, armor, regeneration, dash recharge, and roar range/recharge. Choices remain fixed until you select; upgrades last for the current run.
- Press P or Escape to pause. Switching away automatically pauses the game.
- Runs end at zero health. Restart with a permanent +5 starting health per finished run, capped at +50.
- Best wave and permanent health progression are stored in this browser. No account or backend is required.
- An original synthesized 8-bit music loop starts when you play. Toggle it with the music button. It pauses with the game and when you switch away.

## Checks

```sh
npm test
npm run typecheck
npm run build
```

## Deploy to Vercel

Push this repository to your Git provider, then import it as a new Vercel project. Use the Next.js framework preset with the repository root as the root directory. The build command is `npm run build`. Solo play needs no environment variables or services. Survival online play requires the Firebase configuration below.

The game runs in the browser. Google Fonts enhances typography when available; local sans-serif fallbacks are provided.

## Survival co-op and Google sign-in

`/survival` supports solo play and a shared co-op arena for 2–4 Google-authenticated players. Select **Co-op**, sign in, create a room, and share the eight-character code. Friends join before the host starts. Players share enemies and team kills; each has their own health, movement, dash, roar, and upgrades. All living players must choose an upgrade before the next wave. Fallen players revive at the next wave. Only the host can restart a finished run.

### Firebase setup

1. Create a Firebase project and register a web app in Project settings.
2. Copy `.env.example` to `.env.local` and fill in the web app configuration. Use the exact Realtime Database URL from the Firebase console, including its region when present. These are public client configuration values; do not use a service-account key.
3. Enable **Authentication → Sign-in method → Google** and choose a support email. Add your production domain and `localhost` to Authentication's authorized domains. See [Firebase Google sign-in setup](https://firebase.google.com/docs/auth/web/google-signin).
4. Create a **Realtime Database**. Publish `database.rules.json` in its Rules tab, or use the Firebase CLI: `firebase deploy --only database --project YOUR_PROJECT_ID`. Do not enable public test-mode rules.
5. Restart the dev server. For deployment, set all five `NEXT_PUBLIC_FIREBASE_*` variables before building, then rebuild/redeploy.
6. Open `/survival` in two browser profiles with different Google accounts. Create a room in one, join by code in the other, and start from the host. Confirm both see the same enemies, movement, wave changes, and team results.

Solo play remains available without Firebase configuration. Authentication persists through Firebase's browser session handling. Sign out from the co-op lobby after leaving the room. Popup sign-in requires browser popups to be allowed.

The host's browser simulates combat and publishes snapshots to RTDB; other players publish only their own inputs. Rules restrict shared state writes to the host and player writes to their own membership. This is casual co-op, with no trusted-server anti-cheat or competitive leaderboard. Authenticated users with a room code can read that room; room listing is denied. Only display names and game data are stored in rooms, not email addresses or Google tokens.

Closing/leaving the host's room removes it for everyone. RTDB disconnect handlers remove disconnected guests and close disconnected hosts' rooms. Reconnection after a removed membership requires joining a new lobby. Co-op does not pause when a guest switches tabs; movement stops. Keep the host tab visible for smooth simulation. A closed host tab ends the session once Firebase detects the disconnect. See [Firebase connection and presence handling](https://firebase.google.com/docs/database/web/offline-capabilities).

### Database rule integration check

With a current Java runtime and Firebase CLI installed, run:

```sh
firebase emulators:exec --only auth,database --project demo-twiswua 'node --experimental-strip-types --test tests/firebase.integration.ts'
```

This uses local test identities to check room ownership, four-player capacity, input validation, lobby-only joining, and deletion permissions. It does not contact production Firebase or test Google's OAuth flow.

## Co-op difficulty and automated rule deployment

Each additional player adds 65% to the wave enemy budget, 35% to enemy health, and 20% to the spawn-rate multiplier. Difficulty uses the party size at the start of the wave, including fallen teammates; departures affect the next wave. The host rolls three distinct powerup choices per wave, shares them with the team, and rejects choices outside that menu.

The GitHub workflow `.github/workflows/deploy-database-rules.yml` deploys `database.rules.json` to the `twiswua-com` project when the rules, Firebase configuration, or workflow change on `main`. It uses the existing `FIREBASE_TOKEN` repository secret and Firebase CLI's `--only database` target, as documented in the [Firebase CLI reference](https://firebase.google.com/docs/cli#deploy_specific_firebase_services). Deploy the updated rules along with this release so all eight upgrade choices are accepted.
