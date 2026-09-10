import { test } from "node:test";
import assert from "node:assert/strict";
import { createRun, tick, upgrade, waveSize } from "../lib/game.ts";

test("tiger follows the pointer without overshooting", () => {
  const run = createRun(); run.phase = "playing"; run.targetX = 505;
  tick(run, .05, () => 0);
  assert.equal(run.x, 505); assert.equal(run.y, 320);
  run.targetX = 9999;
  for (let i = 0; i < 100; i++) tick(run, .05, () => 0);
  assert.ok(run.x <= 970);
});
test("pause freezes the run", () => {
  const run = createRun(); run.phase = "paused"; run.targetX = 700;
  const before = structuredClone(run); tick(run, 1);
  assert.deepEqual(run, before);
});
test("claws automatically defeat nearby ducks", () => {
  const run = createRun(); run.phase = "playing"; run.spawnClock = 1;
  run.ducks = [{ x: 540, y: 320, hp: 1, elite: false }];
  tick(run, .01);
  assert.equal(run.kills, 1); assert.equal(run.ducks.length, 0); assert.equal(run.hp, 100);
});
test("contact damage has an invulnerability window", () => {
  const run = createRun(); run.phase = "playing"; run.attack = 10; run.spawnClock = 1;
  run.ducks = [{ x: 501, y: 320, hp: 10, elite: false }];
  tick(run, .01); assert.equal(run.hp, 90);
  tick(run, .01); assert.equal(run.hp, 90);
});
test("clearing a wave requires choosing an upgrade before the next wave", () => {
  const run = createRun(); run.phase = "playing"; run.spawned = waveSize(1);
  tick(run, .01); assert.equal(run.phase, "upgrade");
  const time = run.time; tick(run, .05); assert.equal(run.time, time);
  upgrade(run, "claws");
  assert.equal(run.phase, "playing"); assert.equal(run.wave, 2); assert.equal(run.damage, 2); assert.equal(run.spawned, 0);
  upgrade(run, "claws"); assert.equal(run.damage, 2);
});
test("health upgrade heals without exceeding maximum health", () => {
  const run = createRun(); run.phase = "upgrade"; run.hp = 90;
  upgrade(run, "heart"); assert.equal(run.maxHp, 125); assert.equal(run.hp, 125);
});
test("death ends the run and a new run resets temporary upgrades", () => {
  const run = createRun(); run.phase = "playing"; run.hp = 5; run.attack = 10; run.spawnClock = 1;
  run.ducks = [{ x: 500, y: 320, hp: 10, elite: false }]; tick(run, .01);
  assert.equal(run.phase, "over"); assert.equal(run.hp, 0);
  const next = createRun(1); assert.equal(next.hp, 105); assert.equal(next.damage, 1); assert.equal(next.kills, 0);
  assert.equal(createRun(1000).hp, 150);
});
test("spawn budget stays bounded and later waves introduce stronger ducks", () => {
  const run = createRun(); run.phase = "playing"; run.wave = 4; run.targetX = 950;
  tick(run, .01, () => 0); assert.equal(run.ducks[0].elite, true); assert.equal(run.ducks[0].hp, 4);
  run.spawned = waveSize(4); run.spawnClock = 0;
  tick(run, .01, () => 0); assert.equal(run.spawned, waveSize(4));
});
