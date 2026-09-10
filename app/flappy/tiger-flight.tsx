"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./tiger-flight.module.css";

type Tree = { x: number; gapY: number; scored: boolean };
type Phase = "ready" | "playing" | "over";

const WORLD_W = 420;
const WORLD_H = 720;
const TIGER_X = 92;
const TIGER_R = 19;
const TREE_W = 72;
const GAP = 178;
const SPEED = 128;
const GRAVITY = 1050;
const FLAP = -370;

class FlightMusic {
  private context: AudioContext | null = null;
  private timer: number | null = null;
  private step = 0;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.stop();
  }

  async play() {
    if (this.muted || this.timer !== null) return;
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
    this.step = 0;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 185);
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  dispose() {
    this.stop();
    void this.context?.close();
    this.context = null;
  }

  private tick() {
    if (!this.context || this.muted) return;
    const melody = [659.25, 783.99, 880, 783.99, 659.25, 523.25, 587.33, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33, 523.25, 587.33];
    const bass = [164.81, 164.81, 196, 196, 146.83, 146.83, 174.61, 174.61];
    const now = this.context.currentTime;

    const lead = this.context.createOscillator();
    const leadGain = this.context.createGain();
    lead.type = "square";
    lead.frequency.value = melody[this.step % melody.length];
    leadGain.gain.setValueAtTime(0.025, now);
    leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    lead.connect(leadGain).connect(this.context.destination);
    lead.start(now);
    lead.stop(now + 0.15);

    if (this.step % 2 === 0) {
      const low = this.context.createOscillator();
      const lowGain = this.context.createGain();
      low.type = "triangle";
      low.frequency.value = bass[Math.floor(this.step / 2) % bass.length];
      lowGain.gain.setValueAtTime(0.035, now);
      lowGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      low.connect(lowGain).connect(this.context.destination);
      low.start(now);
      low.stop(now + 0.29);
    }

    this.step += 1;
  }
}

export default function TwisWuaFlight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("ready");
  const tigerY = useRef(WORLD_H * 0.46);
  const velocity = useRef(0);
  const trees = useRef<Tree[]>([]);
  const scoreRef = useRef(0);
  const musicRef = useRef<FlightMusic | null>(null);
  const mutedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);

  const playMusic = useCallback(() => {
    musicRef.current ??= new FlightMusic();
    musicRef.current.setMuted(mutedRef.current);
    void musicRef.current.play();
  }, []);

  const reset = useCallback(() => {
    tigerY.current = WORLD_H * 0.46;
    velocity.current = 0;
    trees.current = [
      { x: 410, gapY: 245, scored: false },
      { x: 650, gapY: 390, scored: false },
      { x: 890, gapY: 300, scored: false },
    ];
    scoreRef.current = 0;
    setScore(0);
  }, []);

  const flap = useCallback(() => {
    if (phaseRef.current === "over" || phaseRef.current === "ready") {
      reset();
      phaseRef.current = "playing";
      setPhase("playing");
      playMusic();
    }
    velocity.current = FLAP;
  }, [playMusic, reset]);

  useEffect(() => {
    try {
      setBest(Math.max(0, Number(localStorage.getItem("tiger-flight-best") || 0)));
      const savedMuted = localStorage.getItem("tiger-flight-muted") === "1";
      mutedRef.current = savedMuted;
      setMuted(savedMuted);
    } catch {}
    reset();
    return () => musicRef.current?.dispose();
  }, [reset]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        flap();
      }
    };
    const visibility = () => {
      if (document.hidden) musicRef.current?.stop();
      else if (phaseRef.current === "playing") playMusic();
    };
    window.addEventListener("keydown", keydown);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keydown);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [flap, playMusic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    let last = performance.now();

    const endGame = () => {
      if (phaseRef.current !== "playing") return;
      phaseRef.current = "over";
      setPhase("over");
      musicRef.current?.stop();
      setBest((current) => {
        const next = Math.max(current, scoreRef.current);
        try { localStorage.setItem("tiger-flight-best", String(next)); } catch {}
        return next;
      });
    };

    const drawTree = (x: number, gapY: number) => {
      const topH = gapY - GAP / 2;
      const bottomY = gapY + GAP / 2;
      ctx.fillStyle = "#4c6b45";
      ctx.fillRect(x + 23, 0, TREE_W - 46, topH);
      ctx.fillRect(x + 23, bottomY, TREE_W - 46, WORLD_H - bottomY);
      ctx.fillStyle = "#638454";
      for (let y = topH - 22; y > -35; y -= 42) {
        ctx.beginPath(); ctx.arc(x + TREE_W / 2, y, 48, 0, Math.PI * 2); ctx.fill();
      }
      for (let y = bottomY + 20; y < WORLD_H + 35; y += 42) {
        ctx.beginPath(); ctx.arc(x + TREE_W / 2, y, 48, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#3d5b3d";
      ctx.fillRect(x + 28, 0, 8, topH);
      ctx.fillRect(x + 28, bottomY, 8, WORLD_H - bottomY);
    };

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.035);
      last = now;
      if (phaseRef.current === "playing") {
        velocity.current += GRAVITY * dt;
        tigerY.current += velocity.current * dt;
        for (const tree of trees.current) {
          tree.x -= SPEED * dt;
          if (!tree.scored && tree.x + TREE_W < TIGER_X) {
            tree.scored = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }
        const first = trees.current[0];
        if (first && first.x + TREE_W < -10) {
          trees.current.shift();
          const lastTree = trees.current[trees.current.length - 1];
          const seed = Math.sin((scoreRef.current + 3) * 12.9898) * 43758.5453;
          const random = seed - Math.floor(seed);
          trees.current.push({ x: lastTree.x + 240, gapY: 215 + random * 290, scored: false });
        }
        const hitTree = trees.current.some((tree) => {
          const horizontal = TIGER_X + TIGER_R > tree.x + 12 && TIGER_X - TIGER_R < tree.x + TREE_W - 12;
          const vertical = tigerY.current - TIGER_R < tree.gapY - GAP / 2 + 10 || tigerY.current + TIGER_R > tree.gapY + GAP / 2 - 10;
          return horizontal && vertical;
        });
        if (tigerY.current < TIGER_R || tigerY.current > WORLD_H - TIGER_R || hitTree) endGame();
      } else if (phaseRef.current === "ready") {
        tigerY.current = WORLD_H * 0.46 + Math.sin(now / 300) * 7;
      }

      ctx.clearRect(0, 0, WORLD_W, WORLD_H);
      const sky = ctx.createLinearGradient(0, 0, 0, WORLD_H);
      sky.addColorStop(0, "#dce9c4"); sky.addColorStop(0.72, "#b8cc96"); sky.addColorStop(1, "#829c67");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      ctx.fillStyle = "#ffffff55";
      ctx.beginPath(); ctx.arc(335, 105, 46, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#78955f55";
      ctx.beginPath(); ctx.moveTo(0, 540); ctx.quadraticCurveTo(95, 455, 185, 540); ctx.quadraticCurveTo(310, 430, 420, 530); ctx.lineTo(420, 720); ctx.lineTo(0, 720); ctx.fill();
      trees.current.forEach((tree) => drawTree(tree.x, tree.gapY));

      ctx.save();
      ctx.translate(TIGER_X, tigerY.current);
      ctx.rotate(Math.max(-0.35, Math.min(0.65, velocity.current / 700)));
      ctx.font = "44px system-ui, Apple Color Emoji, Segoe UI Emoji";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🐯", 0, 0);
      ctx.restore();

      ctx.fillStyle = "#293e31"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.font = "700 48px Outfit, sans-serif"; ctx.fillText(String(scoreRef.current), WORLD_W / 2, 38);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleMusic = () => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    musicRef.current ??= new FlightMusic();
    musicRef.current.setMuted(mutedRef.current);
    try { localStorage.setItem("tiger-flight-muted", mutedRef.current ? "1" : "0"); } catch {}
    if (!mutedRef.current && phaseRef.current === "playing") playMusic();
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Arcade</Link>
        <strong><span>虎</span> TWISWUA <i>FLIGHT</i></strong>
        <div className={styles.headerRight}>
          <button className={styles.music} onClick={toggleMusic} aria-label={muted ? "Turn music on" : "Turn music off"} aria-pressed={!muted}>
            ♫ {muted ? "OFF" : "ON"}
          </button>
          <span className={styles.best}>BEST {best}</span>
        </div>
      </header>
      <section className={styles.game} aria-label="TwisWua Flight game">
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          onPointerDown={(event) => { event.preventDefault(); flap(); }}
          aria-label="TwisWua Flight. Tap or click to flap. On desktop, Space also flaps."
        />
        {phase !== "playing" && (
          <div className={styles.overlay} onPointerDown={(event) => { event.preventDefault(); flap(); }}>
            <div>
              <p>{phase === "ready" ? "A LITTLE TWISWUA. A LOT OF AIR." : `SCORE ${score}`}</p>
              <h1>{phase === "ready" ? <>Take to the <em>trees.</em></> : <>Branches <em>happen.</em></>}</h1>
              <span>{phase === "ready" ? "Tap, click, or press Space to fly" : "Tap, click, or press Space to try again"}</span>
            </div>
          </div>
        )}
      </section>
      <footer className={styles.controls}>
        <span className={styles.desktop}>SPACEBAR OR MOUSE CLICK TO FLAP</span>
        <span className={styles.mobile}>TAP ANYWHERE TO FLAP</span>
        <span>PASS A TREE · +1</span>
      </footer>
    </main>
  );
}
