import {
  createRun,
  dash,
  moveJoystick,
  roar,
  tickWorld,
  upgrade,
  type Run,
  type Upgrade,
} from "./game.ts";

export type PlayerInput = {
  x: number;
  y: number;
  joystick: boolean;
  dash: number;
  roar: number;
  upgrade: Upgrade | "";
  upgradeWave: number;
  upgradeRound: number;
};
export type Member = { name: string; input: PlayerInput };
export type Session = {
  round: number;
  world: Run;
  players: Record<string, Run>;
  consumed: Record<string, { dash: number; roar: number }>;
};
export type Room = {
  host: string;
  members: Record<string, Member>;
  state: Session;
  createdAt: number;
};
export const emptyInput = (): PlayerInput => ({
  x: 500,
  y: 320,
  joystick: false,
  dash: 0,
  roar: 0,
  upgrade: "",
  upgradeWave: 0,
  upgradeRound: 0,
});
export const roomCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (byte) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[byte % 32],
  ).join("");
export const validRoomCode = (code: string) => /^[A-HJ-NP-Z2-9]{8}$/.test(code);

export function createSession(ids: string[], round = 0): Session {
  const players: Record<string, Run> = {};
  const consumed: Session["consumed"] = {};
  ids.forEach((id, index) => {
    const player = createRun();
    player.x = player.targetX = 410 + index * 60;
    players[id] = player;
    consumed[id] = { dash: 0, roar: 0 };
  });
  return { round, world: createRun(), players, consumed };
}

export function normalizeSession(session: Session): Session {
  session.world.ducks ??= [];
  session.world.particles ??= [];
  session.players ??= {};
  session.consumed ??= {};
  for (const player of Object.values(session.players)) {
    player.ducks = session.world.ducks;
    player.particles = session.world.particles;
  }
  return session;
}

export function stepSession(
  session: Session,
  members: Record<string, Member>,
  elapsed: number,
  random = Math.random,
) {
  const { world, players, consumed } = normalizeSession(session);
  for (const id of Object.keys(players))
    if (!members[id]) {
      delete players[id];
      delete consumed[id];
    }
  if (world.phase === "upgrade") {
    const living = Object.entries(players).filter(
      ([, player]) => player.hp > 0,
    );
    if (!living.length) {
      world.phase = "over";
      return;
    }
    if (
      living.every(
        ([id]) =>
          members[id]?.input.upgradeRound === session.round &&
          members[id]?.input.upgradeWave === world.wave &&
          ["claws", "haste", "heart"].includes(members[id]?.input.upgrade),
      )
    ) {
      for (const [id, player] of Object.entries(players)) {
        player.phase = "upgrade";
        if (player.hp <= 0) player.hp = Math.ceil(player.maxHp / 2);
        upgrade(player, members[id]?.input.upgrade || "heart");
      }
      upgrade(world, "claws");
    }
    return;
  }
  if (world.phase !== "playing") return;
  for (const [id, player] of Object.entries(players)) {
    const input = members[id]?.input;
    if (!input || player.hp <= 0) continue;
    player.phase = "playing";
    player.ducks = world.ducks;
    if (input.joystick) moveJoystick(player, input.x, input.y);
    else {
      player.joystick = false;
      player.targetX = Math.max(30, Math.min(970, input.x));
      player.targetY = Math.max(30, Math.min(590, input.y));
    }
    consumed[id] ??= { dash: input.dash, roar: input.roar };
    if (input.dash > consumed[id].dash) dash(player);
    if (input.roar > consumed[id].roar) roar(player);
    consumed[id] = { dash: input.dash, roar: input.roar };
  }
  tickWorld(world, Object.values(players), elapsed, random);
  for (const player of Object.values(players)) {
    player.wave = world.wave;
    player.time = world.time;
    player.kills = world.kills;
  }
}

export function serializeSession(session: Session) {
  return {
    ...session,
    players: Object.fromEntries(
      Object.entries(session.players).map(([id, player]) => [
        id,
        { ...player, ducks: [], particles: [] },
      ]),
    ),
  };
}
