export type Phase = "ready" | "playing" | "paused" | "upgrade" | "over";
export type Upgrade = "claws" | "haste" | "heart";
export type Duck = { x: number; y: number; hp: number; elite: boolean };
export type Particle = { x: number; y: number; life: number };
export type Run = {
  phase: Phase; x: number; y: number; targetX: number; targetY: number;
  hp: number; maxHp: number; wave: number; kills: number; time: number;
  damage: number; speed: number; cooldown: number; attack: number;
  invincible: number; slash: number; spawned: number; spawnClock: number;
  ducks: Duck[]; particles: Particle[];
};
export const WIDTH = 1000;
export const HEIGHT = 620;
export const waveSize = (wave: number) => 8 + wave * 4;
export function createRun(legacy = 0): Run {
  const maxHp = 100 + Math.min(10, Math.max(0, legacy)) * 5;
  return { phase: "ready", x: 500, y: 320, targetX: 500, targetY: 320, hp: maxHp, maxHp, wave: 1, kills: 0, time: 0, damage: 1, speed: 205, cooldown: .65, attack: 0, invincible: 0, slash: 0, spawned: 0, spawnClock: 0, ducks: [], particles: [] };
}
export function upgrade(run: Run, choice: Upgrade) {
  if (run.phase !== "upgrade") return;
  if (choice === "claws") run.damage += 1;
  if (choice === "haste") { run.cooldown = Math.max(.18, run.cooldown * .85); run.speed += 15; }
  if (choice === "heart") { run.maxHp += 25; run.hp = Math.min(run.maxHp, run.hp + 50); }
  run.wave += 1;
  run.spawned = 0;
  run.spawnClock = 0;
  run.phase = "playing";
}
export function tick(run: Run, elapsed: number, random = Math.random) {
  if (run.phase !== "playing") return;
  const dt = Math.min(.05, Math.max(0, elapsed));
  run.time += dt;
  run.attack -= dt;
  run.invincible = Math.max(0, run.invincible - dt);
  run.slash = Math.max(0, run.slash - dt);
  const dx = run.targetX - run.x, dy = run.targetY - run.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 2) {
    const step = Math.min(distance, run.speed * dt);
    run.x = Math.max(30, Math.min(WIDTH - 30, run.x + dx / distance * step));
    run.y = Math.max(30, Math.min(HEIGHT - 30, run.y + dy / distance * step));
  }
  run.spawnClock -= dt;
  if (run.spawned < waveSize(run.wave) && run.spawnClock <= 0) {
    const edge = Math.floor(random() * 4), position = random();
    const elite = run.wave >= 3 && random() < .25;
    run.ducks.push({ x: edge === 0 ? -20 : edge === 1 ? WIDTH + 20 : position * WIDTH, y: edge === 2 ? -20 : edge === 3 ? HEIGHT + 20 : position * HEIGHT, hp: (elite ? 3 : 1) + Math.floor(run.wave / 4), elite });
    run.spawned++;
    run.spawnClock = Math.max(.22, 1 - run.wave * .055);
  }
  const strike = run.attack <= 0 && run.ducks.some(d => Math.hypot(d.x - run.x, d.y - run.y) < 100);
  if (strike) { run.attack = run.cooldown; run.slash = .2; }
  for (const duck of run.ducks) {
    const x = run.x - duck.x, y = run.y - duck.y, length = Math.hypot(x, y);
    if (strike && length < 100) { duck.hp -= run.damage; duck.x -= x / (length || 1) * 22; duck.y -= y / (length || 1) * 22; }
    if (duck.hp <= 0) { run.kills++; run.particles.push({ x: duck.x, y: duck.y, life: .6 }); continue; }
    const speed = Math.min(165, 48 + run.wave * 6) * (duck.elite ? .8 : 1);
    duck.x += x / (length || 1) * speed * dt;
    duck.y += y / (length || 1) * speed * dt;
    if (length < 32 && run.invincible <= 0) { run.hp = Math.max(0, run.hp - (duck.elite ? 18 : 10)); run.invincible = .8; }
  }
  run.ducks = run.ducks.filter(d => d.hp > 0);
  run.particles = run.particles.filter(p => (p.life -= dt) > 0);
  if (run.hp <= 0) run.phase = "over";
  else if (run.spawned === waveSize(run.wave) && run.ducks.length === 0) run.phase = "upgrade";
}
