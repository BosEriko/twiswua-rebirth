"use client";

import { useEffect, useRef, useState } from "react";
import {
  createRun,
  HEIGHT,
  tick,
  upgrade,
  waveSize,
  WIDTH,
  type Upgrade,
} from "../lib/game";
import { draw } from "../lib/draw";

const choices: {
  id: Upgrade;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    id: "claws",
    icon: "✦",
    title: "Sharper claws",
    description: "+1 damage to every swipe. Make feathers fly.",
  },
  {
    id: "haste",
    icon: "ϟ",
    title: "Wild instinct",
    description: "Attack 15% faster and move a little quicker.",
  },
  {
    id: "heart",
    icon: "♡",
    title: "Heart of the jungle",
    description: "+25 maximum health. Recover 50 health.",
  },
];
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

export default function Game() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const run = useRef(createRun());
  const [hud, setHud] = useState({ ...run.current });
  const [record, setRecord] = useState({ best: 0, runs: 0 });
  const recordRef = useRef(record);
  const [help, setHelp] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const sync = () => setHud({ ...run.current });

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
    };
    window.addEventListener("keydown", key);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  function start() {
    run.current = createRun(recordRef.current.runs);
    run.current.phase = "playing";
    setHelp(false);
    sync();
    canvas.current?.focus();
  }
  function togglePause() {
    if (run.current.phase === "playing") run.current.phase = "paused";
    else if (run.current.phase === "paused") run.current.phase = "playing";
    sync();
  }
  function select(choice: Upgrade) {
    upgrade(run.current, choice);
    sync();
    canvas.current?.focus();
  }
  const phase = hud.phase;
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Tiger Tide home">
          <span className="brand-mark">虎</span> TIGER
          <span className="brand-light">TIDE</span>
          <span className="edition">FIELD NOTES / 001</span>
        </a>
        <button
          className="text-button"
          onClick={() => {
            if (run.current.phase === "playing") {
              run.current.phase = "paused";
              sync();
            }
            setHelp(true);
          }}
        >
          How to play <span>↗</span>
        </button>
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

      <section className="game-layout" aria-label="Tiger Tide game">
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
              aria-label="Game arena. Move your mouse or drag to guide the tiger. Arrow keys also move. P pauses."
              onPointerMove={(e) => {
                if (run.current.phase !== "playing") return;
                const rect = e.currentTarget.getBoundingClientRect();
                run.current.targetX = Math.max(
                  30,
                  Math.min(
                    WIDTH - 30,
                    ((e.clientX - rect.left) / rect.width) * WIDTH,
                  ),
                );
                run.current.targetY = Math.max(
                  30,
                  Math.min(
                    HEIGHT - 30,
                    ((e.clientY - rect.top) / rect.height) * HEIGHT,
                  ),
                );
              }}
              onPointerDown={(e) => {
                e.currentTarget.focus();
                const rect = e.currentTarget.getBoundingClientRect();
                run.current.targetX =
                  ((e.clientX - rect.left) / rect.width) * WIDTH;
                run.current.targetY =
                  ((e.clientY - rect.top) / rect.height) * HEIGHT;
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
                  {hud.spawned - hud.ducks.length} / {waveSize(hud.wave)}{" "}
                  cleared
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
                      {choices.map((choice) => (
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
                    {phase === "ready"
                      ? "MOVE YOUR MOUSE. WE’LL HANDLE THE CLAWS."
                      : phase === "over"
                        ? `Legacy bonus: +${Math.min(record.runs, 10) * 5} starting health on your next run`
                        : phase === "paused"
                          ? "PRESS P OR ESC TO RESUME"
                          : "A fresh flock is on its way."}
                  </small>
                </div>
              </div>
            )}
          </div>
          <div className="arena-bottom">
            <span>
              <span className="mouse-icon">↖</span> Move to explore{" "}
              <span className="bottom-separator">·</span> Auto-attack is on
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
          TIGER TIDE <span>·</span> MADE FOR YOUR WILD SIDE.
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
        <section
          className="help-dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="eyebrow">A QUICK FIELD BRIEFING</div>
          <h2 id="help-title">Trust your instincts.</h2>
          <p>
            Move your mouse inside the glade to lead your tiger. On
            touchscreens, drag a finger. Arrow keys or WASD also work.
          </p>
          <p>
            Your claws automatically swipe at nearby ducks. Keep moving to avoid
            contact damage. Clear every duck in a wave, then choose an upgrade.
          </p>
          <p>
            Press P or Escape to pause. Each completed run earns +5 starting
            health for future runs, up to +50, saved in this browser.
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
