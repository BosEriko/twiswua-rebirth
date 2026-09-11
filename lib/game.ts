export type Phase = "ready" | "playing" | "paused" | "upgrade" | "over";
export type Upgrade = "claws" | "haste" | "heart";
export type Duck = { x: number; y: number; hp: number; elite: boolean };
export type Particle = { x: number; y: number; life: number };
export type Run = {
  phase: Phase;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  joystick: boolean;
  moveX: number;
  moveY: number;
  facingX: number;
  facingY: number;
  dash: number;
  dashCooldown: number;
  roar: number;
  roarCooldown: number;
  hp: number;
  maxHp: number;
  wave: number;
  kills: number;
  time: number;
  damage: number;
  speed: number;
  cooldown: number;
  attack: number;
  invincible: number;
  slash: number;
  spawned: number;
  spawnClock: number;
  ducks: Duck[];
  particles: Particle[];
};
export const WIDTH = 1000;
export const HEIGHT = 620;
export const waveSize = (wave: number) => 8 + wave * 4;
export function createRun(legacy = 0): Run {
  const maxHp = 100 + Math.min(10, Math.max(0, legacy)) * 5;
  return {
    phase: "ready",
    x: 500,
    y: 320,
    targetX: 500,
    targetY: 320,
    joystick: false,
    moveX: 0,
    moveY: 0,
    facingX: 1,
    facingY: 0,
    dash: 0,
    dashCooldown: 0,
    roar: 0,
    roarCooldown: 0,
    hp: maxHp,
    maxHp,
    wave: 1,
    kills: 0,
    time: 0,
    damage: 1,
    speed: 205,
    cooldown: 0.65,
    attack: 0,
    invincible: 0,
    slash: 0,
    spawned: 0,
    spawnClock: 0,
    ducks: [],
    particles: [],
  };
}
export function moveJoystick(run: Run, x: number, y: number) {
  const magnitude = Math.max(1, Math.hypot(x, y));
  run.joystick = true;
  run.moveX = x / magnitude;
  run.moveY = y / magnitude;
  run.targetX = run.x;
  run.targetY = run.y;
}
export function dash(run: Run) {
  if (run.phase !== "playing" || run.dashCooldown > 0) return;
  run.dash = 0.18;
  run.dashCooldown = 3;
  run.invincible = Math.max(run.invincible, 0.25);
}
export function roar(run: Run) {
  if (run.phase !== "playing" || run.roarCooldown > 0) return;
  run.roar = 0.35;
  run.roarCooldown = 6;
  for (const duck of run.ducks) {
    const dx = duck.x - run.x,
      dy = duck.y - run.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 160) {
      duck.hp -= run.damage * 2;
      duck.x += (dx / (distance || 1)) * 75;
      duck.y += (dy / (distance || 1)) * 75;
    }
  }
}
export function upgrade(run: Run, choice: Upgrade) {
  if (run.phase !== "upgrade") return;
  if (choice === "claws") run.damage += 1;
  if (choice === "haste") {
    run.cooldown = Math.max(0.18, run.cooldown * 0.85);
    run.speed += 15;
  }
  if (choice === "heart") {
    run.maxHp += 25;
    run.hp = Math.min(run.maxHp, run.hp + 50);
  }
  run.wave += 1;
  run.spawned = 0;
  run.spawnClock = 0;
  run.phase = "playing";
}
export function tick(run: Run, elapsed: number, random = Math.random) {
  tickWorld(run, [run], elapsed, random);
}
export function tickWorld(
  run: Run,
  players: Run[],
  elapsed: number,
  random = Math.random,
) {
  if (run.phase !== "playing") return;
  const dt = Math.min(0.05, Math.max(0, elapsed));
  run.time += dt;
  const alive = players.filter((player) => player.hp > 0);
  for (const player of alive) {
    player.attack -= dt;
    player.invincible = Math.max(0, player.invincible - dt);
    player.slash = Math.max(0, player.slash - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.roarCooldown = Math.max(0, player.roarCooldown - dt);
    player.roar = Math.max(0, player.roar - dt);
    const dashing = player.dash > 0;
    const dx = dashing
        ? player.facingX
        : player.joystick
          ? player.moveX
          : player.targetX - player.x,
      dy = dashing
        ? player.facingY
        : player.joystick
          ? player.moveY
          : player.targetY - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > (player.joystick || dashing ? 0.01 : 2)) {
      player.facingX = dx / distance;
      player.facingY = dy / distance;
      const step = dashing
        ? player.speed * 3.5 * dt
        : player.joystick
          ? player.speed * Math.min(1, distance) * dt
          : Math.min(distance, player.speed * dt);
      player.x = Math.max(
        30,
        Math.min(WIDTH - 30, player.x + (dx / distance) * step),
      );
      player.y = Math.max(
        30,
        Math.min(HEIGHT - 30, player.y + (dy / distance) * step),
      );
    }
    player.dash = Math.max(0, player.dash - dt);
  }
  run.spawnClock -= dt;
  if (run.spawned < waveSize(run.wave) && run.spawnClock <= 0) {
    const edge = Math.floor(random() * 4),
      position = random();
    const elite = run.wave >= 3 && random() < 0.25;
    run.ducks.push({
      x: edge === 0 ? -20 : edge === 1 ? WIDTH + 20 : position * WIDTH,
      y: edge === 2 ? -20 : edge === 3 ? HEIGHT + 20 : position * HEIGHT,
      hp: (elite ? 3 : 1) + Math.floor(run.wave / 4),
      elite,
    });
    run.spawned++;
    run.spawnClock = Math.max(0.22, 1 - run.wave * 0.055);
  }
  const striking = alive.filter(
    (player) =>
      player.attack <= 0 &&
      run.ducks.some((d) => Math.hypot(d.x - player.x, d.y - player.y) < 100),
  );
  for (const player of striking) {
    player.attack = player.cooldown;
    player.slash = 0.2;
  }
  for (const duck of run.ducks) {
    const targets = alive.map((player) => ({
      player,
      x: player.x - duck.x,
      y: player.y - duck.y,
      length: Math.hypot(player.x - duck.x, player.y - duck.y),
    }));
    for (const { player, x, y, length } of targets) {
      if (striking.includes(player) && length < 100) {
        duck.hp -= player.damage;
        duck.x -= (x / (length || 1)) * 22;
        duck.y -= (y / (length || 1)) * 22;
      }
    }
    if (duck.hp <= 0) {
      run.kills++;
      run.particles.push({ x: duck.x, y: duck.y, life: 0.6 });
      continue;
    }
    const target = targets.reduce<(typeof targets)[number] | undefined>(
      (nearest, candidate) =>
        !nearest || candidate.length < nearest.length ? candidate : nearest,
      undefined,
    );
    if (!target) continue;
    const { x, y, length } = target;
    const speed = Math.min(165, 48 + run.wave * 6) * (duck.elite ? 0.8 : 1);
    duck.x += (x / (length || 1)) * speed * dt;
    duck.y += (y / (length || 1)) * speed * dt;
    for (const { player, length: contactDistance } of targets) {
      if (contactDistance < 32 && player.invincible <= 0) {
        player.hp = Math.max(0, player.hp - (duck.elite ? 18 : 10));
        player.invincible = 0.8;
      }
    }
  }
  run.ducks = run.ducks.filter((d) => d.hp > 0);
  run.particles = run.particles.filter((p) => (p.life -= dt) > 0);
  if (players.every((player) => player.hp <= 0)) run.phase = "over";
  else if (run.spawned === waveSize(run.wave) && run.ducks.length === 0)
    run.phase = "upgrade";
}
