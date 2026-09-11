"use client";

import { useEffect, useRef, useState } from "react";
import Game from "../game";
import HandheldControls from "../handheld-controls";
import { draw, tiger } from "../../lib/draw";
import { HEIGHT, WIDTH, powerups, type Upgrade } from "../../lib/game";
import { useRoom } from "./use-room";
import styles from "./survival.module.css";

export default function Survival() {
  const online = useRoom();
  const [lobby, setLobby] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const { session, input, room, user, connected, code } = online;
  const phase = room?.state.world.phase || "ready";
  const player = user ? room?.state.players[user.uid] : undefined;
  const playing =
    !!room && phase === "playing" && !!player && player.hp > 0 && connected;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    if (!playing) {
      input.current.joystick = true;
      input.current.x = input.current.y = 0;
    }
  }, [playing, input]);

  useEffect(() => {
    if (!code) return;
    let frame = 0;
    const render = (now: number) => {
      const element = canvas.current;
      const context = element?.getContext("2d");
      const state = session.current;
      if (element && context && state && user) {
        const local = state.players[user.uid];
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        if (element.width !== WIDTH * ratio) {
          element.width = WIDTH * ratio;
          element.height = HEIGHT * ratio;
        }
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        draw(
          context,
          {
            ...state.world,
            ...local,
            phase: state.world.phase,
            ducks: state.world.ducks,
            particles: state.world.particles,
            projectiles: state.world.projectiles,
          },
          now / 1000,
        );
        for (const [id, teammate] of Object.entries(state.players)) {
          context.globalAlpha = teammate.hp > 0 ? 1 : 0.3;
          if (id !== user.uid)
            tiger(context, teammate.x, teammate.y, 1, state.world.time);
          context.fillStyle = id === user.uid ? "#244a36" : "#754414";
          context.font = "bold 15px sans-serif";
          context.textAlign = "center";
          context.fillText(
            id === user.uid
              ? "YOU"
              : `PLAYER ${Object.keys(state.players).indexOf(id) + 1}`,
            teammate.x,
            teammate.y - 44,
          );
          context.globalAlpha = 1;
        }
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const keys = new Set<string>();
    const move = () => {
      input.current.joystick = true;
      input.current.x =
        Number(keys.has("KeyD") || keys.has("ArrowRight")) -
        Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      input.current.y =
        Number(keys.has("KeyS") || keys.has("ArrowDown")) -
        Number(keys.has("KeyW") || keys.has("ArrowUp"));
    };
    const keydown = (event: KeyboardEvent) => {
      if (!playingRef.current || event.target instanceof HTMLInputElement)
        return;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(event.code)
      ) {
        event.preventDefault();
        keys.add(event.code);
        move();
      }
      if (!event.repeat && event.code === "KeyJ") input.current.dash++;
      if (!event.repeat && event.code === "KeyK") input.current.roar++;
    };
    const keyup = (event: KeyboardEvent) => {
      if (keys.delete(event.code)) move();
    };
    const stop = () => {
      keys.clear();
      move();
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [code, session, input, user]);

  const signIn = (
    <button
      className={styles.button}
      disabled={!online.configured || !online.authReady || online.busy}
      onClick={online.login}
    >
      Sign in with Google
    </button>
  );
  if (!lobby)
    return (
      <Game
        onlineControls={
          <button className={styles.button} onClick={() => setLobby(true)}>
            Co-op
          </button>
        }
      />
    );

  function choose(choice: Upgrade) {
    input.current.upgrade = choice;
    input.current.upgradeWave = room!.state.world.wave;
    input.current.upgradeRound = room!.state.round;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a
          className="brand survival-brand"
          href="/"
          aria-label="TwisWua Survival home"
        >
          <span className="brand-mark" aria-hidden="true">
            🐯
          </span>{" "}
          TwisWua Survival
        </a>
        <div className={styles.actions}>
          {!code && (
            <button className={styles.button} onClick={() => setLobby(false)}>
              Solo play
            </button>
          )}
          {user ? (
            <>
              <span>{user.displayName || "Explorer"}</span>
              <button
                className={styles.button}
                disabled={online.busy || !!code}
                onClick={online.logout}
              >
                Sign out
              </button>
            </>
          ) : (
            signIn
          )}
        </div>
      </header>
      {!room ? (
        <section className={styles.lobby}>
          <span className="eyebrow">SURVIVAL / CO-OP</span>
          <h1>
            The wild is better
            <br />
            <em>with company.</em>
          </h1>
          <p>One glade. Up to four explorers. Fight the flock together.</p>
          {!online.configured ? (
            <p role="status">
              Online play is not configured yet. Add the Firebase web app
              settings to enable Google sign-in and co-op. Solo play is
              available.
            </p>
          ) : !user ? (
            <p>Sign in with Google to create a room or join your friends.</p>
          ) : (
            <>
              <p role="status">
                {connected
                  ? "Connected · Ready to explore"
                  : "Connecting to the jungle…"}
              </p>
              <button
                className="primary-button"
                disabled={!connected || online.busy}
                onClick={() => online.enter()}
              >
                Create a room ↗
              </button>
              <form
                className={styles.join}
                onSubmit={(event) => {
                  event.preventDefault();
                  void online.enter(joinCode);
                }}
              >
                <label htmlFor="room-code">Have a room code?</label>
                <div className={styles.actions}>
                  <input
                    id="room-code"
                    value={joinCode}
                    onChange={(event) =>
                      setJoinCode(event.target.value.toUpperCase())
                    }
                    placeholder="ABCDEFGH"
                    maxLength={8}
                    minLength={8}
                    required
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                  <button
                    className={styles.button}
                    disabled={!connected || online.busy}
                  >
                    Join room
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      ) : (
        <>
          <section className={styles.roomBar} aria-label="Room details">
            <div>
              <span className="eyebrow">ROOM CODE</span>
              <strong className={styles.code}>{code}</strong>
              <small>Share this code with your friends.</small>
            </div>
            <p role="status">
              {connected
                ? online.host
                  ? "You are hosting"
                  : "Connected to host"
                : "Connection lost · Waiting for Firebase"}
            </p>
            <button
              className={styles.button}
              disabled={online.busy || !connected}
              onClick={online.leave}
            >
              {online.host ? "Close room" : "Leave room"}
            </button>
          </section>
          <section className={styles.team} aria-label="Your team">
            {Object.entries(room.members).map(([id, member], index) => (
              <div key={id}>
                <strong>
                  {index + 1}. {member.name}
                  {id === user?.uid ? " (you)" : ""}
                </strong>
                <span>
                  {room.state.players[id]?.hp > 0
                    ? `${Math.ceil(room.state.players[id].hp)} HP`
                    : phase === "ready"
                      ? "Joining…"
                      : "Down · Returns next wave"}
                </span>
              </div>
            ))}
          </section>
          <div className={styles.arena}>
            <canvas
              ref={canvas}
              width={WIDTH}
              height={HEIGHT}
              tabIndex={0}
              aria-label="Co-op arena. Mouse or WASD to move, J to dash, K to roar."
              onPointerMove={(event) => {
                if (!playing || event.pointerType === "touch") return;
                const rect = event.currentTarget.getBoundingClientRect();
                input.current.joystick = false;
                input.current.x =
                  ((event.clientX - rect.left) / rect.width) * WIDTH;
                input.current.y =
                  ((event.clientY - rect.top) / rect.height) * HEIGHT;
              }}
            />
            {(phase !== "playing" || !connected) && (
              <div className={styles.overlay}>
                {!connected ? (
                  <h2>Reconnecting…</h2>
                ) : phase === "ready" ? (
                  <>
                    <h2>Gather your expedition.</h2>
                    <p>
                      {Object.keys(room.members).length} / 4 explorers · At
                      least two to begin.
                    </p>
                    {online.host ? (
                      <button
                        className="primary-button"
                        disabled={Object.keys(room.members).length < 2}
                        onClick={online.start}
                      >
                        Start together ↗
                      </button>
                    ) : (
                      <p>Waiting for the host to start.</p>
                    )}
                  </>
                ) : phase === "over" ? (
                  <>
                    <h2>The flock wins this round.</h2>
                    <p>
                      Wave {room.state.world.wave} · {room.state.world.kills}{" "}
                      ducks defeated
                    </p>
                    {online.host ? (
                      <button
                        className="primary-button"
                        disabled={Object.keys(room.members).length < 2}
                        onClick={online.start}
                      >
                        Play again ↗
                      </button>
                    ) : (
                      <p>Waiting for the host to play again.</p>
                    )}
                  </>
                ) : (
                  <>
                    <h2>Wave {room.state.world.wave} complete.</h2>
                    <p>
                      {player && player.hp <= 0
                        ? "Your team is choosing upgrades. You return next wave."
                        : "Choose your upgrade. The next wave starts when everyone is ready."}
                    </p>
                    {player && player.hp > 0 && (
                      <div className={styles.actions}>
                        {room.state.world.upgradeChoices.map((choice) => (
                          <button
                            className={styles.button}
                            key={choice}
                            onClick={() => choose(choice)}
                            aria-pressed={
                              room.members[user!.uid]?.input.upgradeRound ===
                                room.state.round &&
                              room.members[user!.uid]?.input.upgradeWave ===
                                room.state.world.wave &&
                              room.members[user!.uid]?.input.upgrade === choice
                            }
                          >
                            {powerups[choice].icon} {powerups[choice].title} —{" "}
                            {powerups[choice].description}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className={styles.status}>
            <span>
              WAVE {room.state.world.wave} · {room.state.world.kills} DUCKS
            </span>
            <span>
              {player && player.hp <= 0
                ? "You are down. Watch your teammates."
                : "Mouse / WASD · J dash · K roar · Co-op does not pause"}
            </span>
          </div>
          <div className={styles.controls}>
            <HandheldControls
              phase={playing ? "playing" : "ready"}
              dashCooldown={player?.dashCooldown || 0}
              roarCooldown={player?.roarCooldown || 0}
              onMove={(x, y) => {
                input.current.joystick = true;
                input.current.x = x;
                input.current.y = y;
              }}
              onDash={() => {
                if (playing) input.current.dash++;
              }}
              onRoar={() => {
                if (playing) input.current.roar++;
              }}
              onStart={online.start}
              onPause={() => {
                input.current.joystick = true;
                input.current.x = input.current.y = 0;
              }}
            />
          </div>
        </>
      )}
      {online.error && (
        <p className={styles.error} role="alert">
          {online.error}
        </p>
      )}
    </main>
  );
}
