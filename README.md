# Tiger Tide

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
- Claws automatically attack ducks within range. Avoid touching enemies.
- Defeat every duck to finish a wave and choose a damage, speed, or health upgrade.
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

Push this repository to your Git provider, then import it as a new Vercel project. Use the Next.js framework preset with the repository root as the root directory. The build command is `npm run build`. No environment variables, database, or additional services are needed.

The game runs in the browser. Google Fonts enhances typography when available; local sans-serif fallbacks are provided.
