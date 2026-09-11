import { test } from "node:test";
import assert from "node:assert/strict";
import { powerups } from "../lib/game.ts";
import {
  createSession,
  emptyInput,
  roomCode,
  serializeSession,
} from "../lib/survival-room.ts";

const databaseHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const project = process.env.GCLOUD_PROJECT || "demo-twiswua";

if (!databaseHost || !authHost)
  throw new Error(
    "Run this test through Firebase emulators:exec with Auth and Database enabled.",
  );

test("RTDB enforces room ownership, capacity, input validation, and lobby-only joining", async () => {
  async function account() {
    const response = await fetch(
      `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true }),
      },
    );
    assert.equal(response.status, 200);
    return (await response.json()) as { localId: string; idToken: string };
  }
  const users = await Promise.all(Array.from({ length: 5 }, account));
  const [host, guest] = users;
  const code = roomCode();
  async function request(
    path: string,
    method = "GET",
    value?: unknown,
    token = host.idToken,
  ) {
    return fetch(
      `http://${databaseHost}/${path}.json?ns=${project}-default-rtdb${token ? `&auth=${token}` : ""}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
      },
    );
  }
  const path = `survival/rooms/${code}`;
  const member = { name: "Explorer", input: emptyInput() };
  const state = serializeSession(createSession([host.localId]));
  assert.equal(
    (
      await request(path, "PUT", {
        host: host.localId,
        createdAt: Date.now(),
        members: { [host.localId]: member },
        state,
      })
    ).status,
    200,
  );
  try {
    assert.equal((await request(path, "GET", undefined, "")).status, 401);
    assert.equal(
      (await request("survival/rooms", "GET", undefined, guest.idToken)).status,
      401,
    );
    for (const user of users.slice(1, 4))
      assert.equal(
        (
          await request(
            `${path}/members/${user.localId}`,
            "PUT",
            member,
            user.idToken,
          )
        ).status,
        200,
      );
    assert.equal(
      (
        await request(
          `${path}/members/${users[4].localId}`,
          "PUT",
          member,
          users[4].idToken,
        )
      ).status,
      401,
    );
    assert.equal(
      (await request(`${path}/state`, "PUT", state, guest.idToken)).status,
      401,
    );
    assert.equal(
      (
        await request(
          `${path}/members/${host.localId}/input/x`,
          "PUT",
          20,
          guest.idToken,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await request(
          `${path}/members/${guest.localId}/input/x`,
          "PUT",
          "invalid",
          guest.idToken,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await request(
          `${path}/members/${guest.localId}/input/x`,
          "PUT",
          200,
          guest.idToken,
        )
      ).status,
      200,
    );
    for (const choice of Object.keys(powerups)) {
      assert.equal(
        (
          await request(
            `${path}/members/${guest.localId}/input/upgrade`,
            "PUT",
            choice,
            guest.idToken,
          )
        ).status,
        200,
      );
    }
    assert.equal(
      (await request(`${path}/state/world/phase`, "PUT", "playing")).status,
      200,
    );
    assert.equal(
      (
        await request(
          `${path}/members/${guest.localId}`,
          "DELETE",
          undefined,
          guest.idToken,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          `${path}/members/${guest.localId}`,
          "PUT",
          member,
          guest.idToken,
        )
      ).status,
      401,
    );
    assert.equal(
      (await request(path, "DELETE", undefined, guest.idToken)).status,
      401,
    );
  } finally {
    assert.equal((await request(path, "DELETE")).status, 200);
  }
  assert.equal(await (await request(path)).json(), null);
});
