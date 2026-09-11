import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  dash,
  moveJoystick,
  roar,
  tick,
  upgrade,
  waveSize,
} from "../lib/game.ts";

test("tiger follows the pointer without overshooting", () => {
  const run = createRun();
  run.phase = "playing";
  run.targetX = 505;
  tick(run, 0.05, () => 0);
  assert.equal(run.x, 505);
  assert.equal(run.y, 320);
  run.targetX = 9999;
  for (let i = 0; i < 100; i++) tick(run, 0.05, () => 0);
  assert.ok(run.x <= 970);
});
test("pause freezes the run", () => {
  const run = createRun();
  run.phase = "paused";
  run.targetX = 700;
  const before = structuredClone(run);
  tick(run, 1);
  assert.deepEqual(run, before);
});
test("claws automatically defeat nearby ducks", () => {
  const run = createRun();
  run.phase = "playing";
  run.spawnClock = 1;
  run.ducks = [{ x: 540, y: 320, hp: 1, elite: false }];
  tick(run, 0.01);
  assert.equal(run.kills, 1);
  assert.equal(run.ducks.length, 0);
  assert.equal(run.hp, 100);
});
test("contact damage has an invulnerability window", () => {
  const run = createRun();
  run.phase = "playing";
  run.attack = 10;
  run.spawnClock = 1;
  run.ducks = [{ x: 501, y: 320, hp: 10, elite: false }];
  tick(run, 0.01);
  assert.equal(run.hp, 90);
  tick(run, 0.01);
  assert.equal(run.hp, 90);
});
test("clearing a wave requires choosing an upgrade before the next wave", () => {
  const run = createRun();
  run.phase = "playing";
  run.spawned = waveSize(1);
  tick(run, 0.01, () => 0);
  assert.equal(run.phase, "upgrade");
  const time = run.time;
  tick(run, 0.05);
  assert.equal(run.time, time);
  upgrade(run, "claws");
  assert.equal(run.phase, "playing");
  assert.equal(run.wave, 2);
  assert.equal(run.damage, 2);
  assert.equal(run.spawned, 0);
  upgrade(run, "claws");
  assert.equal(run.damage, 2);
});
test("health upgrade heals without exceeding maximum health", () => {
  const run = createRun();
  run.phase = "upgrade";
  run.upgradeChoices = ["heart", "claws", "haste"];
  run.hp = 90;
  upgrade(run, "heart");
  assert.equal(run.maxHp, 125);
  assert.equal(run.hp, 125);
});
test("death ends the run and a new run resets temporary upgrades", () => {
  const run = createRun();
  run.phase = "playing";
  run.hp = 5;
  run.attack = 10;
  run.spawnClock = 1;
  run.ducks = [{ x: 500, y: 320, hp: 10, elite: false }];
  tick(run, 0.01);
  assert.equal(run.phase, "over");
  assert.equal(run.hp, 0);
  const next = createRun(1);
  assert.equal(next.hp, 105);
  assert.equal(next.damage, 1);
  assert.equal(next.kills, 0);
  assert.equal(createRun(1000).hp, 150);
});
test("spawn budget stays bounded and later waves introduce stronger ducks", () => {
  const run = createRun();
  run.phase = "playing";
  run.wave = 4;
  run.targetX = 950;
  tick(run, 0.01, () => 0);
  assert.equal(run.ducks[0].elite, true);
  assert.equal(run.ducks[0].hp, 4);
  run.spawned = waveSize(4);
  run.spawnClock = 0;
  tick(run, 0.01, () => 0);
  assert.equal(run.spawned, waveSize(4));
});

test("joystick moves continuously and release stops immediately", () => {
  const run = createRun();
  run.phase = "playing";
  run.spawnClock = 100;
  moveJoystick(run, 1, 0);
  for (let i = 0; i < 10; i++) tick(run, 0.05);
  assert.ok(run.x > 600);
  assert.equal(run.y, 320);
  moveJoystick(run, 0, 0);
  const x = run.x;
  tick(run, 0.05);
  assert.equal(run.x, x);
});

test("diagonal joystick movement is bounded to normal speed and arena edges", () => {
  const run = createRun();
  run.phase = "playing";
  run.spawnClock = 100;
  moveJoystick(run, 10, 10);
  tick(run, 0.05);
  assert.ok(
    Math.abs(Math.hypot(run.x - 500, run.y - 320) - run.speed * 0.05) < 0.001,
  );
  run.x = 969;
  run.y = 589;
  tick(run, 0.05);
  assert.equal(run.x, 970);
  assert.equal(run.y, 590);
});

test("A dashes in the last movement direction and respects cooldown and pause", () => {
  const run = createRun();
  run.phase = "playing";
  run.spawnClock = 100;
  moveJoystick(run, -1, 0);
  tick(run, 0.05);
  moveJoystick(run, 0, 0);
  dash(run);
  assert.equal(run.dashCooldown, 3);
  assert.equal(run.invincible, 0.25);
  const x = run.x;
  tick(run, 0.05);
  assert.ok(x - run.x > run.speed * 0.05);
  const cooldown = run.dashCooldown;
  dash(run);
  assert.equal(run.dashCooldown, cooldown);
  run.phase = "paused";
  const before = structuredClone(run);
  tick(run, 0.05);
  dash(run);
  assert.deepEqual(run, before);
});

test("B damages and repels nearby ducks but leaves distant ducks alone", () => {
  const run = createRun();
  run.phase = "playing";
  run.spawnClock = 100;
  run.attack = 100;
  run.ducks = [
    { x: 540, y: 320, hp: 1, elite: false },
    { x: 550, y: 320, hp: 5, elite: true },
    { x: 800, y: 320, hp: 1, elite: false },
  ];
  roar(run);
  assert.equal(run.roarCooldown, 6);
  assert.equal(run.ducks[1].hp, 3);
  assert.equal(run.ducks[1].x, 625);
  assert.equal(run.ducks[2].hp, 1);
  roar(run);
  assert.equal(run.ducks[1].hp, 3);
  tick(run, 0.01);
  assert.equal(run.kills, 1);
  assert.equal(run.ducks.length, 2);
});

test("abilities cannot activate outside a live run and reset on restart", () => {
  for (const phase of ["ready", "paused", "upgrade", "over"] as const) {
    const run = createRun();
    run.phase = phase;
    const before = structuredClone(run);
    dash(run);
    roar(run);
    assert.deepEqual(run, before);
  }
  const fresh = createRun(3);
  assert.equal(fresh.dashCooldown, 0);
  assert.equal(fresh.roarCooldown, 0);
});
