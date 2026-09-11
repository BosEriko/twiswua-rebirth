"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  createRun,
  dash,
  HEIGHT,
  moveJoystick,
  roar,
  powerups,
  tick,
  upgrade,
  waveSize,
  WIDTH,
  type Upgrade,
} from "../lib/game";
import { draw } from "../lib/draw";
import { Chiptune } from "../lib/music";
import HandheldControls from "./handheld-controls";

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

export default function Game({
  onlineControls,
}: {
  onlineControls?: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const run = useRef(createRun());
  const music = useRef<Chiptune | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({ ...run.current });
  const [record, setRecord] = useState({ best: 0, runs: 0 });
  const recordRef = useRef(record);
  const [help, setHelp] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const sync = () => setHud({ ...run.current });

  function playMusic() {
    if (mutedRef.current) return;
    music.current ??= new Chiptune();
    music.current.play();
  }

  function stopMovement() {
    if (run.current.joystick) moveJoystick(run.current, 0, 0);
  }

  useEffect(() => {
    if (help) helpDialog.current?.showModal();
    else helpDialog.current?.close();
  }, [help]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("tiger-tide-v1") || "{}");
      const value = {
        best: Number.isFinite(saved.best)
          ? Math.max(0, Math.floor(saved.best))
          : 0,
        runs: Number.isFinite(saved.runs)
          ? Math.max(0, Math.floor(saved.runs))
          : 0,
      };
      recordRef.current = value;
      setRecord(value);
      run.current = createRun(value.runs);
      setHud({ ...run.current });
    } catch {
      setStorageUnavailable(true);
    }
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    let frame = 0,
      last = 0,
      update = 0;
    const render = (timestamp: number) => {
      const state = run.current;
      const previous = state.phase;
      tick(state, last ? (timestamp - last) / 1000 : 0);
      last = timestamp;
      if (previous === "playing" && state.phase !== "playing") {
        stopMovement();
        music.current?.pause();
      }
      if (state.phase === "over" && previous !== "over") {
        const next = {
          best: Math.max(recordRef.current.best, state.wave),
          runs: recordRef.current.runs + 1,
        };
        recordRef.current = next;
        setRecord(next);
        try {
          localStorage.setItem("tiger-tide-v1", JSON.stringify(next));
        } catch {
          setStorageUnavailable(true);
        }
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (element.width !== WIDTH * ratio) {
        element.width = WIDTH * ratio;
        element.height = HEIGHT * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(context, state, timestamp / 1000);
      if (timestamp - update > 100 || previous !== state.phase) {
        setHud({ ...state });
        update = timestamp;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const pause = () => {
      if (run.current.phase === "playing") {
        run.current.phase = "paused";
        stopMovement();
        music.current?.pause();
        setHud({ ...run.current });
      }
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    const key = (event: KeyboardEvent) => {
      if (helpDialog.current?.open) return;
      if (event.code === "Escape" || event.code === "KeyP") {
        if (run.current.phase === "playing") pause();
        else if (run.current.phase === "paused") {
          run.current.phase = "playing";
          playMusic();
          setHud({ ...run.current });
        }
      }
      const directions: Record<string, [number, number]> = {
        ArrowLeft: [-65, 0],
        ArrowRight: [65, 0],
        ArrowUp: [0, -65],
        ArrowDown: [0, 65],
        KeyA: [-65, 0],
        KeyD: [65, 0],
        KeyW: [0, -65],
        KeyS: [0, 65],
      };
      if (directions[event.code] && run.current.phase === "playing") {
        event.preventDefault();
        run.current.joystick = false;
        const [x, y] = directions[event.code];
        run.current.targetX = Math.max(
          30,
          Math.min(WIDTH - 30, run.current.targetX + x),
        );
        run.current.targetY = Math.max(
          30,
          Math.min(HEIGHT - 30, run.current.targetY + y),
        );
      }
      if (!event.repeat && event.code === "KeyJ") dash(run.current);
      if (!event.repeat && event.code === "KeyK") roar(run.current);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    const handheld = window.matchMedia(
      "(max-width: 760px), (pointer: coarse) and (max-width: 1024px) and (max-height: 600px)",
    );
    handheld.addEventListener("change", pause);
    return () => {
      cancelAnimationFrame(frame);
      music.current?.dispose();
      music.current = null;
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
      handheld.removeEventListener("change", pause);
    };
  }, []);

  function start() {
    run.current = createRun(recordRef.current.runs);
    run.current.phase = "playing";
    playMusic();
    setHelp(false);
    sync();
    canvas.current?.focus({ preventScroll: true });
  }
  function aim(event: PointerEvent<HTMLCanvasElement>) {
    if (run.current.phase !== "playing" || event.pointerType === "touch")
      return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const contained = getComputedStyle(element).objectFit === "contain";
    const scale = Math.min(rect.width / WIDTH, rect.height / HEIGHT);
    const width = contained ? WIDTH * scale : rect.width;
    const height = contained ? HEIGHT * scale : rect.height;
    run.current.joystick = false;
    run.current.targetX = Math.max(
      30,
      Math.min(
        WIDTH - 30,
        ((event.clientX - rect.left - (rect.width - width) / 2) / width) *
          WIDTH,
      ),
    );
    run.current.targetY = Math.max(
      30,
      Math.min(
        HEIGHT - 30,
        ((event.clientY - rect.top - (rect.height - height) / 2) / height) *
          HEIGHT,
      ),
    );
  }
  function togglePause() {
    if (run.current.phase === "playing") {
      run.current.phase = "paused";
      stopMovement();
      music.current?.pause();
    } else if (run.current.phase === "paused") {
      run.current.phase = "playing";
      playMusic();
    }
    sync();
  }
  function select(choice: Upgrade) {
    upgrade(run.current, choice);
    playMusic();
    sync();
    canvas.current?.focus({ preventScroll: true });
  }
  const phase = hud.phase;
  return (
    <main>
      <header className="site-header">
        <a
          className="brand survival-brand"
          href="/"
          aria-label="TwisWua Survival home"
        >
          <span className="brand-mark" aria-hidden="true">
            🐯
          </span>{" "}
          TwisWua <span className="brand-light">Survival</span>
          <span className="edition">FIELD NOTES / 001</span>
        </a>
        <div className="header-actions">
          {onlineControls}
          <button
            className="music-button"
            aria-label={muted ? "Enable music" : "Mute music"}
            aria-pressed={!muted}
            onClick={() => {
              mutedRef.current = !mutedRef.current;
              setMuted(mutedRef.current);
              if (mutedRef.current) music.current?.pause();
              else if (run.current.phase === "playing") playMusic();
            }}
          >
            <span aria-hidden="true">♫</span> {muted ? "OFF" : "ON"}
          </button>
          <button
            className="text-button"
            onClick={() => {
              if (run.current.phase === "playing") {
                run.current.phase = "paused";
                stopMovement();
                music.current?.pause();
                sync();
              }
              setHelp(true);
            }}
          >
            How to play <span>↗</span>
          </button>
        </div>
      </header>

      <section className="intro">
        <div>
          <div className="eyebrow">
            <span className="little-line" /> A LITTLE TIGER. A LOT OF TROUBLE.
          </div>
          <h1>
            The jungle is yours.
            <br />
            <em>The ducks disagree.</em>
          </h1>
          <p>
            Follow your instinct. Dodge the flock. Live to roar another day.
          </p>
        </div>
        <div className="intro-note">
          <span className="leaf">❧</span>
          <span>
            A bite-sized survival roguelite.
            <br />
            One mouse. Nine lives. Endless ducks.
          </span>
          <small>WELL, TECHNICALLY ONE LIFE.</small>
        </div>
      </section>

      <section className="game-layout" aria-label="TwisWua Survival game">
        <div className="game-column">
          <div className="arena-top">
            <span>
              <span className="live-dot" /> THE OVERGROWN GLADE
            </span>
            <span>
              BIOME 01 <span className="divider">/</span> ENDLESS SURVIVAL
            </span>
          </div>
          <div className="arena">
            <canvas
              ref={canvas}
              width={WIDTH}
              height={HEIGHT}
              tabIndex={0}
              aria-label="Game arena. Use the joystick on mobile or your mouse on desktop. Arrow keys also move. P pauses."
              onPointerMove={aim}
              onPointerDown={(e) => {
                if (e.pointerType === "touch") return;
                e.currentTarget.focus({ preventScroll: true });
                aim(e);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
            />
            <div className="arena-corner">
              N<span>↑</span>
            </div>
            {phase === "playing" && (
              <div className="wave-label">
                WAVE {String(hud.wave).padStart(2, "0")}{" "}
                <span>
                  {hud.spawned - hud.ducks.length} /{" "}
                  {waveSize(hud.wave, hud.partySize)} cleared
                </span>
              </div>
            )}
            {(phase === "ready" ||
              phase === "paused" ||
              phase === "over" ||
              phase === "upgrade") && (
              <div className={`overlay ${phase === "ready" ? "welcome" : ""}`}>
                <div
                  className={`modal ${phase === "upgrade" ? "upgrade-modal" : ""}`}
                >
                  <div className="eyebrow">
                    {phase === "ready"
                      ? "SMALL PAWS. BIG ENERGY."
                      : phase === "paused"
                        ? "TAKE A BREATHER"
                        : phase === "over"
                          ? "THE FLOCK GOT THE LAST QUACK"
                          : `WAVE ${hud.wave} COMPLETE`}
                  </div>
                  <h2>
                    {phase === "ready" ? (
                      <>
                        Unleash your
                        <br />
                        <em>inner tiger.</em>
                      </>
                    ) : phase === "paused" ? (
                      "A moment in the shade."
                    ) : phase === "over" ? (
                      "Every tiger rises again."
                    ) : (
                      "Grow a little wilder."
                    )}
                  </h2>
                  <p>
                    {phase === "ready"
                      ? "An unlikely hero. An unreasonable number of ducks."
                      : phase === "paused"
                        ? "Your jungle will be right here."
                        : phase === "over"
                          ? `${hud.kills} ducks defeated · ${formatTime(hud.time)} survived · Wave ${hud.wave}`
                          : "Choose one upgrade for the rest of this run."}
                  </p>
                  {phase === "upgrade" ? (
                    <div className="upgrade-options">
                      {hud.upgradeChoices
                        .map((id) => ({ id, ...powerups[id] }))
                        .map((choice) => (
                          <button
                            key={choice.id}
                            onClick={() => select(choice.id)}
                          >
                            <span>{choice.icon}</span>
                            <strong>{choice.title}</strong>
                            <small>{choice.description}</small>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <button
                      className="primary-button"
                      onClick={phase === "paused" ? togglePause : start}
                    >
                      {phase === "ready"
                        ? "Enter the wild"
                        : phase === "paused"
                          ? "Back to the wild"
                          : "One more run"}
                      <span>↗</span>
                    </button>
                  )}
                  <small className="modal-hint">
                    {phase === "ready" ? (
                      <>
                        <span className="desktop-hint">
                          MOVE YOUR MOUSE. WE’LL HANDLE THE CLAWS.
                        </span>
                        <span className="mobile-hint">
                          JOYSTICK TO MOVE · A DASH · B ROAR
                        </span>
                      </>
                    ) : phase === "over" ? (
                      `Legacy bonus: +${Math.min(record.runs, 10) * 5} starting health on your next run`
                    ) : phase === "paused" ? (
                      <>
                        <span className="desktop-hint">
                          PRESS P OR ESC TO RESUME
                        </span>
                        <span className="mobile-hint">
                          PRESS RESUME WHEN YOU’RE READY
                        </span>
                      </>
                    ) : (
                      "A fresh flock is on its way."
                    )}
                  </small>
                </div>
              </div>
            )}
          </div>
          <div className="mobile-hud">
            <div className="mobile-vitality">
              <span>
                ♥ {Math.ceil(hud.hp)} / {hud.maxHp}
              </span>
              <div
                role="progressbar"
                aria-label="Tiger health"
                aria-valuenow={Math.ceil(hud.hp)}
                aria-valuemin={0}
                aria-valuemax={hud.maxHp}
              >
                <i style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
              </div>
            </div>
            <span>
              WAVE <b>{String(hud.wave).padStart(2, "0")}</b>
            </span>
            <span>
              DUCKS <b>{hud.kills}</b>
            </span>
            <span>{formatTime(hud.time)}</span>
          </div>
          <div className="arena-bottom">
            <span>
              <span className="mouse-icon">↖</span> Move to explore{" "}
              <span className="bottom-separator">·</span> Auto-attack · J dash ·
              K roar
            </span>
            <button
              disabled={phase !== "playing" && phase !== "paused"}
              onClick={togglePause}
            >
              <kbd>P</kbd> {phase === "paused" ? "Resume" : "Pause"}
            </button>
          </div>
        </div>

        <aside className="sidebar">
          <div className="run-title">
            <span className="eyebrow">YOUR EXPEDITION</span>
            <span className="run-status">
              {phase === "ready"
                ? "Not started"
                : phase === "over"
                  ? "Finished"
                  : phase === "paused"
                    ? "Paused"
                    : "In the wild"}
            </span>
          </div>
          <div className="hero-profile">
            <div className="tiger-avatar" aria-hidden="true">
              🐯
            </div>
            <div>
              <h3>The little tiger</h3>
              <span>Very brave. Mildly outnumbered.</span>
            </div>
          </div>
          <div className="health-label">
            <span>♡ &nbsp; VITALITY</span>
            <strong>
              {Math.ceil(hud.hp)} <span>/ {hud.maxHp}</span>
            </strong>
          </div>
          <div
            className="health-track"
            role="progressbar"
            aria-label="Health"
            aria-valuenow={Math.ceil(hud.hp)}
            aria-valuemin={0}
            aria-valuemax={hud.maxHp}
          >
            <div style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
          </div>
          <div className="stats">
            <div>
              <span>CURRENT WAVE</span>
              <strong>
                {String(hud.wave).padStart(2, "0")}
                <small> / ∞</small>
              </strong>
            </div>
            <div>
              <span>DUCKS DEFEATED</span>
              <strong>{String(hud.kills).padStart(2, "0")}</strong>
            </div>
            <div>
              <span>TIME IN THE WILD</span>
              <strong>{formatTime(hud.time)}</strong>
            </div>
          </div>
          <div className="loadout">
            <div className="eyebrow">YOUR NATURAL ADVANTAGES</div>
            <div>
              <span className="ability-icon">✦</span>
              <div>
                <strong>Claw & order</strong>
                <small>{hud.damage} damage · automatic swipes</small>
              </div>
              <span className="ability-level">
                {hud.damage > 1 ? `LV ${hud.damage}` : "LV 1"}
              </span>
            </div>
            <div>
              <span className="ability-icon">ϟ</span>
              <div>
                <strong>Feline reflexes</strong>
                <small>
                  {hud.speed} speed · {hud.cooldown.toFixed(2)}s attack
                </small>
              </div>
            </div>
          </div>
          <div className="legacy">
            <span>✧</span>
            <div>
              <strong>A little stronger, every time.</strong>
              <p>
                Each run adds +5 starting health, up to +50. Your courage
                carries over.
              </p>
              <small>
                LEGACY +{Math.min(record.runs, 10) * 5} HP{" "}
                <span>BEST WAVE {String(record.best).padStart(2, "0")}</span>
              </small>
            </div>
          </div>
          {storageUnavailable && (
            <p className="storage-note">
              Browser storage is unavailable. Progress lasts for this visit.
            </p>
          )}
        </aside>
        <HandheldControls
          phase={phase}
          dashCooldown={hud.dashCooldown}
          roarCooldown={hud.roarCooldown}
          onMove={(x, y) => moveJoystick(run.current, x, y)}
          onDash={() => {
            dash(run.current);
            sync();
          }}
          onRoar={() => {
            roar(run.current);
            sync();
          }}
          onStart={start}
          onPause={togglePause}
        />
      </section>
      <section className="field-guide">
        <div className="guide-heading">
          <span className="eyebrow">THE SURVIVAL FIELD GUIDE</span>
          <span>Simple instincts. Endless possibilities.</span>
        </div>
        <div className="guide-items">
          <article>
            <span>01</span>
            <div>
              <h3>Lead with your mouse.</h3>
              <p>
                Your tiger follows your cursor.
                <br />
                Keep moving. Stay curious.
              </p>
            </div>
            <b>↖</b>
          </article>
          <article>
            <span>02</span>
            <div>
              <h3>Let the claws do the talking.</h3>
              <p>
                Get close to attack automatically.
                <br />
                Just don’t get too comfortable.
              </p>
            </div>
            <b>✳</b>
          </article>
          <article>
            <span>03</span>
            <div>
              <h3>Survive. Adapt. Repeat.</h3>
              <p>
                Clear waves, pick upgrades.
                <br />
                Come back a little stronger.
              </p>
            </div>
            <b>↻</b>
          </article>
        </div>
      </section>
      <footer>
        <span>
          TwisWua Survival <span>·</span> MADE FOR YOUR WILD SIDE.
        </span>
        <span>
          No downloads. Just ducks. <span className="footer-flower">✳</span>
        </span>
      </footer>
      <dialog
        ref={helpDialog}
        className="help-backdrop"
        aria-labelledby="help-title"
        onCancel={() => setHelp(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setHelp(false);
        }}
      >
        <section className="help-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="eyebrow">A QUICK FIELD BRIEFING</div>
          <h2 id="help-title">Trust your instincts.</h2>
          <p>
            On mobile, hold the joystick to move and release it to stop. A
            dashes through danger; B roars to damage and push back nearby ducks.
            On desktop, use your mouse or arrow keys / WASD, with J to dash and
            K to roar.
          </p>
          <p>
            Your claws automatically swipe at nearby ducks. Keep moving to avoid
            contact damage. From wave 5, red-ringed ducks fire aimed shots; keep
            moving when their beaks flash. Clear every duck in a wave, then
            choose one of three random upgrades.
          </p>
          <p>
            Press P or Escape to pause. Each completed run earns +5 starting
            health for future runs, up to +50, saved in this browser.
          </p>
          <p>
            Music starts when you play. Use the ♫ button to mute or enable the
            8-bit soundtrack.
          </p>
          <button
            autoFocus
            className="primary-button"
            onClick={() => setHelp(false)}
          >
            Got it <span>↗</span>
          </button>
        </section>
      </dialog>
    </main>
  );
}
