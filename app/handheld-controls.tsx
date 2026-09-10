"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Phase } from "../lib/game";

type Props = {
  phase: Phase;
  dashCooldown: number;
  roarCooldown: number;
  onMove: (x: number, y: number) => void;
  onDash: () => void;
  onRoar: () => void;
  onStart: () => void;
  onPause: () => void;
};

export default function HandheldControls({
  phase,
  dashCooldown,
  roarCooldown,
  onMove,
  onDash,
  onRoar,
  onStart,
  onPause,
}: Props) {
  const pointer = useRef<number | null>(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const playing = phase === "playing";

  useEffect(() => {
    if (!playing) {
      pointer.current = null;
      setStick({ x: 0, y: 0 });
    }
  }, [playing]);

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (pointer.current !== event.pointerId || !playing) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const radius = rect.width * 0.28;
    const distance = Math.hypot(x, y);
    const scale = distance > radius ? radius / distance : 1;
    setStick({ x: x * scale, y: y * scale });
    onMove(
      distance < 6 ? 0 : (x * scale) / radius,
      distance < 6 ? 0 : (y * scale) / radius,
    );
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    setStick({ x: 0, y: 0 });
    onMove(0, 0);
  }

  return (
    <section className="handheld-controls" aria-label="Handheld controller">
      <div className="console-wordmark">
        TIGER TIDE <span>pocket</span>
        <small>8-BIT WILD EDITION</small>
      </div>
      <div className="control-row">
        <div className="joystick-group">
          <button
            className="joystick"
            aria-label="Movement joystick. Drag to move; release to stop."
            disabled={!playing}
            onPointerDown={(event) => {
              if (pointer.current !== null) return;
              pointer.current = event.pointerId;
              event.currentTarget.setPointerCapture(event.pointerId);
              move(event);
            }}
            onPointerMove={move}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span className="joystick-direction north">▴</span>
            <span className="joystick-direction south">▾</span>
            <span className="joystick-direction west">◂</span>
            <span className="joystick-direction east">▸</span>
            <span
              className="joystick-thumb"
              style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }}
            >
              <span />
            </span>
          </button>
          <span className="control-caption">MOVE</span>
        </div>
        <div className="action-buttons">
          <div className="action-group action-b">
            <button
              className="console-action"
              aria-label="B: Roar"
              disabled={!playing || roarCooldown > 0}
              onPointerDown={(event) => {
                event.preventDefault();
                onRoar();
              }}
              onClick={(event) => {
                if (event.detail === 0) onRoar();
              }}
            >
              B
            </button>
            <span className="control-caption">
              {roarCooldown > 0 ? `${Math.ceil(roarCooldown)}s` : "ROAR"}
            </span>
          </div>
          <div className="action-group action-a">
            <button
              className="console-action"
              aria-label="A: Dash"
              disabled={!playing || dashCooldown > 0}
              onPointerDown={(event) => {
                event.preventDefault();
                onDash();
              }}
              onClick={(event) => {
                if (event.detail === 0) onDash();
              }}
            >
              A
            </button>
            <span className="control-caption">
              {dashCooldown > 0 ? `${Math.ceil(dashCooldown)}s` : "DASH"}
            </span>
          </div>
        </div>
      </div>
      <div className="console-bottom">
        <div className="console-system-buttons">
          <button
            onClick={onPause}
            disabled={phase !== "playing" && phase !== "paused"}
          >
            <span />
            {phase === "paused" ? "RESUME" : "PAUSE"}
          </button>
          <button
            onClick={phase === "paused" ? onPause : onStart}
            disabled={playing || phase === "upgrade"}
          >
            <span />
            START
          </button>
        </div>
        <div className="speaker" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <p className="console-hint">
        {phase === "ready"
          ? "Press START. Answer the call of the wild."
          : phase === "upgrade"
            ? "Pick your upgrade on the screen above."
            : "Auto-claws on. Keep your paws moving."}
      </p>
    </section>
  );
}
