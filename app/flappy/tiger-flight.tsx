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

export default function TigerFlight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>("ready");
  const tigerY = useRef(WORLD_H * 0.46);
  const velocity = useRef(0);
  const trees = useRef<Tree[]>([]);
  const scoreRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

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
    if (phaseRef.current === "over") {
      reset();
      phaseRef.current = "playing";
      setPhase("playing");
    } else if (phaseRef.current === "ready") {
      reset();
      phaseRef.current = "playing";
      setPhase("playing");
    }
    velocity.current = FLAP;
  }, [reset]);

  useEffect(() => {
    try {
      setBest(Math.max(0, Number(localStorage.getItem("tiger-flight-best") || 0)));
    } catch {}
    reset();
  }, [reset]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [flap]);

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

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>← Games</Link>
        <strong><span>虎</span> TIGER <i>FLIGHT</i></strong>
        <span className={styles.best}>BEST {best}</span>
      </header>
      <section className={styles.game} aria-label="Tiger Flight game">
        <canvas
          ref={canvasRef}
          width={WORLD_W}
          height={WORLD_H}
          onPointerDown={(event) => { event.preventDefault(); flap(); }}
          aria-label="Tiger Flight. Tap or click to flap. On desktop, Space also flaps."
        />
        {phase !== "playing" && (
          <div className={styles.overlay} onPointerDown={(event) => { event.preventDefault(); flap(); }}>
            <div>
              <p>{phase === "ready" ? "A LITTLE TIGER. A LOT OF AIR." : `SCORE ${score}`}</p>
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
