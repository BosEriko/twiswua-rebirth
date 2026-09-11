import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  emptyInput,
  normalizeSession,
  serializeSession,
  stepSession,
  validRoomCode,
  roomCode,
  type Member,
} from "../lib/survival-room.ts";
import { waveSize } from "../lib/game.ts";

const members = (): Record<string, Member> => ({
  a: { name: "A", input: emptyInput() },
  b: { name: "B", input: emptyInput() },
});

test("co-op moves each player independently in one shared world", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "playing";
  const team = members();
  team.a.input = { ...emptyInput(), joystick: true, x: -1, y: 0 };
  team.b.input = { ...emptyInput(), joystick: true, x: 1, y: 0 };
  stepSession(session, team, 0.05, () => 0);
  assert.ok(session.players.a.x < 410);
  assert.ok(session.players.b.x > 470);
  assert.equal(session.world.spawned, 1);
  assert.equal(session.world.ducks.length, 1);
});

test("ducks target a living teammate and a fallen host does not end the run", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "playing";
  session.world.spawnClock = 100;
  session.players.a.hp = 0;
  session.players.b.attack = 100;
  session.world.ducks = [{ x: 480, y: 320, hp: 100, elite: false }];
  stepSession(session, members(), 0.01);
  assert.equal(session.players.b.hp, 90);
  assert.equal(session.world.phase, "playing");
  session.players.b.hp = 0;
  stepSession(session, members(), 0.01);
  assert.equal(session.world.phase, "over");
});

test("team attacks kill shared enemies once", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "playing";
  session.world.spawnClock = 100;
  session.world.ducks = [{ x: 450, y: 320, hp: 2, elite: false }];
  stepSession(session, members(), 0.01);
  assert.equal(session.world.ducks.length, 0);
  assert.equal(session.world.kills, 1);
});

test("upgrade waits for every living player and rejects stale wave choices", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "playing";
  session.world.spawned = waveSize(1);
  const team = members();
  stepSession(session, team, 0.01);
  assert.equal(session.world.phase, "upgrade");
  team.a.input.upgrade = "claws";
  team.a.input.upgradeWave = 1;
  team.b.input.upgrade = "heart";
  stepSession(session, team, 0.01);
  assert.equal(session.world.phase, "upgrade");
  team.b.input.upgradeWave = 1;
  stepSession(session, team, 0.01);
  assert.equal(session.world.phase, "playing");
  assert.equal(session.world.wave, 2);
  assert.equal(session.players.a.damage, 2);
  assert.equal(session.players.b.maxHp, 125);
});

test("fallen teammate revives when surviving teammate upgrades", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "upgrade";
  session.players.b.hp = 0;
  const team = members();
  team.a.input.upgrade = "haste";
  team.a.input.upgradeWave = 1;
  stepSession(session, team, 0.01);
  assert.equal(session.world.phase, "playing");
  assert.ok(session.players.b.hp > 0);
});

test("an ability input is consumed once even after cooldown expires", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "playing";
  session.world.spawnClock = 100;
  const team = members();
  team.a.input.roar = 1;
  stepSession(session, team, 0.01);
  assert.ok(session.players.a.roarCooldown > 5);
  session.players.a.roarCooldown = 0;
  stepSession(session, team, 0.01);
  assert.equal(session.players.a.roarCooldown, 0);
});

test("disconnected players stop blocking upgrades; losing all living players ends a wave", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "upgrade";
  const team = members();
  delete team.b;
  session.players.a.hp = 0;
  stepSession(session, team, 0.01);
  assert.equal(session.world.phase, "over");
  assert.equal(session.players.b, undefined);
});

test("RTDB omitted empty arrays are restored before gameplay", () => {
  const session = createSession(["a", "b"]);
  const wire = JSON.parse(
    JSON.stringify(serializeSession(session), (_key, value) =>
      Array.isArray(value) && !value.length ? undefined : value,
    ),
  );
  normalizeSession(wire);
  wire.world.phase = "playing";
  stepSession(wire, members(), 0.01);
  assert.equal(wire.world.ducks.length, 1);
  assert.ok(Array.isArray(wire.world.particles));
});

test("room codes are shareable and reject database path characters", () => {
  for (let i = 0; i < 50; i++) assert.ok(validRoomCode(roomCode()));
  for (const code of ["abc", "../rooms", "ABCD/EFG", "ABCD.EFG", "ABCDEFG0"])
    assert.equal(validRoomCode(code), false);
});

test("a replay waits for new upgrade choices instead of reusing the previous run", () => {
  const session = createSession(["a", "b"], 2);
  session.world.phase = "upgrade";
  const team = members();
  for (const member of Object.values(team)) {
    member.input.upgrade = "heart";
    member.input.upgradeWave = 1;
    member.input.upgradeRound = 1;
  }
  stepSession(session, team, 0.01);
  assert.equal(session.world.phase, "upgrade");
  for (const member of Object.values(team)) member.input.upgradeRound = 2;
  stepSession(session, team, 0.01);
  assert.equal(session.world.phase, "playing");
});
