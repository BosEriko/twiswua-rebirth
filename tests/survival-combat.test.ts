import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  dash,
  roar,
  tick,
  tickWorld,
  upgrade,
  waveSize,
  rollUpgrades,
  powerups,
  type Upgrade,
} from "../lib/game.ts";
import {
  createSession,
  emptyInput,
  normalizeSession,
  serializeSession,
  stepSession,
} from "../lib/survival-room.ts";

function liveRun() {
  const run = createRun();
  run.phase = "playing";
  run.spawnClock = 100;
  return run;
}

function apply(choice: Upgrade) {
  const run = createRun();
  run.phase = "upgrade";
  run.upgradeChoices = [choice];
  upgrade(run, choice);
  run.spawnClock = 100;
  return run;
}

test("shooters begin at wave five and fire aimed projectiles on a cooldown", () => {
  for (const wave of [1, 4, 5, 8]) {
    const run = liveRun();
    run.wave = wave;
    run.spawnClock = 0;
    tick(run, 0.01, () => 0);
    assert.equal(run.ducks[0].shooter, wave >= 5);
  }
  const run = liveRun();
  run.wave = 5;
  run.ducks = [
    { x: 300, y: 320, hp: 10, elite: false, shooter: true, shotCooldown: 0 },
  ];
  tick(run, 0.05);
  assert.equal(run.projectiles.length, 1);
  assert.ok(run.projectiles[0].vx > 0);
  assert.equal(run.projectiles[0].vy, 0);
  assert.equal(run.ducks[0].x, 300);
  tick(run, 0.05);
  assert.equal(run.projectiles.length, 1);
});

test("shots hit once, respect invulnerability, and are removed on hit or expiry", () => {
  for (const invincible of [0, 1]) {
    const run = liveRun();
    run.invincible = invincible;
    run.projectiles = [
      { x: 450, y: 320, vx: 2000, vy: 0, life: 1, damage: 12 },
    ];
    tick(run, 0.05);
    assert.equal(run.hp, invincible ? 100 : 88);
    assert.equal(run.projectiles.length, 0);
  }
  const run = liveRun();
  run.projectiles = [{ x: 100, y: 100, vx: 10, vy: 0, life: 0.01, damage: 12 }];
  tick(run, 0.05);
  assert.equal(run.projectiles.length, 0);
});

test("shooters aim at a living teammate, not a fallen host", () => {
  const world = liveRun();
  const dead = createRun();
  dead.hp = 0;
  const alive = createRun();
  alive.x = alive.targetX = 300;
  alive.y = alive.targetY = 400;
  world.ducks = [
    { x: 300, y: 200, hp: 10, elite: false, shooter: true, shotCooldown: 0 },
  ];
  tickWorld(world, [dead, alive], 0.01);
  assert.equal(world.projectiles[0].vx, 0);
  assert.ok(world.projectiles[0].vy > 0);
});

test("larger parties face bigger, tougher, faster-spawning waves", () => {
  const waves = [1, 2, 3, 4].map((size) => {
    const run = liveRun();
    run.partySize = size;
    run.wave = 4;
    run.spawnClock = 0;
    tick(run, 0.01, () => 0);
    return run;
  });
  assert.equal(waveSize(1), 12);
  for (let i = 1; i < waves.length; i++) {
    assert.ok(waveSize(4, i + 1) > waveSize(4, i));
    assert.ok(waves[i].ducks[0].hp > waves[i - 1].ducks[0].hp);
    assert.ok(waves[i].spawnClock < waves[i - 1].spawnClock);
  }
});

test("random upgrade menus contain three distinct options, persist while choosing, and reroll next wave", () => {
  assert.equal(new Set(rollUpgrades(() => 0)).size, 3);
  assert.notDeepEqual(
    rollUpgrades(() => 0),
    rollUpgrades(() => 0.99),
  );
  const all = new Set([
    ...rollUpgrades(() => 0),
    ...rollUpgrades(() => 0.5),
    ...rollUpgrades(() => 0.99),
  ]);
  assert.equal(all.size, Object.keys(powerups).length);
  const run = liveRun();
  run.spawned = waveSize(1);
  tick(run, 0.01, () => 0);
  const choices = [...run.upgradeChoices];
  tick(run, 0.05, () => 0.99);
  assert.deepEqual(run.upgradeChoices, choices);
  upgrade(run, "armor");
  assert.equal(run.phase, "upgrade");
  upgrade(run, choices[0]);
  assert.equal(run.phase, "playing");
  run.spawned = waveSize(2);
  tick(run, 0.01, () => 0.99);
  assert.notDeepEqual(run.upgradeChoices, choices);
});

test("new powerups affect combat and reset with a fresh run", () => {
  const reach = apply("reach");
  reach.ducks = [{ x: 610, y: 320, hp: 1, elite: false }];
  tick(reach, 0.01);
  assert.equal(reach.kills, 1);
  const armor = apply("armor");
  armor.projectiles = [{ x: 500, y: 320, vx: 0, vy: 0, life: 1, damage: 20 }];
  tick(armor, 0.01);
  assert.equal(armor.hp, 83);
  const recovery = apply("recovery");
  recovery.hp = 99.99;
  tick(recovery, 0.05);
  assert.equal(recovery.hp, recovery.maxHp);
  const quick = apply("dash");
  dash(quick);
  assert.ok(quick.dashCooldown < 3);
  const thunder = apply("roar");
  thunder.ducks = [{ x: 675, y: 320, hp: 3, elite: false }];
  roar(thunder);
  assert.equal(thunder.ducks[0].hp, 1);
  assert.ok(thunder.roarCooldown < 6);
  const fresh = createRun();
  assert.equal(fresh.clawRange, 100);
  assert.equal(fresh.damageTaken, 1);
  assert.equal(fresh.regeneration, 0);
  assert.equal(fresh.projectiles.length, 0);
});

test("co-op shares the host menu and rejects valid upgrades that were not offered", () => {
  const session = createSession(["a", "b"]);
  session.world.phase = "upgrade";
  session.world.upgradeChoices = ["reach", "armor", "recovery"];
  const members = {
    a: {
      name: "A",
      input: { ...emptyInput(), upgrade: "claws" as Upgrade, upgradeWave: 1 },
    },
    b: {
      name: "B",
      input: { ...emptyInput(), upgrade: "armor" as Upgrade, upgradeWave: 1 },
    },
  };
  const wire = normalizeSession(
    JSON.parse(JSON.stringify(serializeSession(session))),
  );
  assert.deepEqual(wire.world.upgradeChoices, session.world.upgradeChoices);
  stepSession(session, members, 0.05);
  assert.equal(session.world.phase, "upgrade");
  members.a.input.upgrade = "reach";
  stepSession(session, members, 0.05);
  assert.equal(session.world.phase, "playing");
  assert.equal(session.players.a.clawRange, 120);
  assert.equal(session.players.b.damageTaken, 0.85);
});

test("a disconnect changes difficulty next wave without shrinking the current spawn budget", () => {
  const session = createSession(["a", "b"]);
  const members = { a: { name: "A", input: emptyInput() } };
  session.world.phase = "playing";
  stepSession(session, members, 0.01);
  assert.equal(session.world.partySize, 2);
  session.world.phase = "upgrade";
  session.world.upgradeChoices = ["heart", "claws", "haste"];
  members.a.input.upgrade = "heart";
  members.a.input.upgradeWave = 1;
  stepSession(session, members, 0.01);
  assert.equal(session.world.partySize, 1);
});

test("clearing a wave removes leftover projectiles", () => {
  const run = liveRun();
  run.spawned = waveSize(1);
  run.projectiles = [{ x: 10, y: 10, vx: 20, vy: 0, life: 1, damage: 12 }];
  tick(run, 0.01);
  assert.equal(run.phase, "upgrade");
  assert.equal(run.projectiles.length, 0);
});
