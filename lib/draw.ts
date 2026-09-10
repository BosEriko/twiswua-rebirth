import { HEIGHT, WIDTH, type Run } from "./game";

function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}
export function tiger(c: CanvasRenderingContext2D, x: number, y: number, scale = 1, time = 0) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  ellipse(c, 0, 25, 27, 8, "#203c2930");
  c.strokeStyle = "#dc782d"; c.lineWidth = 9; c.lineCap = "round";
  c.beginPath(); c.moveTo(17, 15); c.bezierCurveTo(42, 20, 38, -6, 28, 3); c.stroke();
  ellipse(c, 0, 10, 21, 22, "#ec933b");
  ellipse(c, -12, 27 + Math.sin(time * 10) * 2, 8, 6, "#f7b65a"); ellipse(c, 12, 27 - Math.sin(time * 10) * 2, 8, 6, "#f7b65a");
  ellipse(c, -18, -22, 10, 10, "#713f28"); ellipse(c, 18, -22, 10, 10, "#713f28");
  ellipse(c, -18, -22, 6, 6, "#efb966"); ellipse(c, 18, -22, 6, 6, "#efb966");
  ellipse(c, 0, -7, 28, 25, "#f5a644");
  c.fillStyle = "#543e2c";
  for (const side of [-1, 1]) { for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(side * 26, -19 + i * 11); c.lineTo(side * 14, -14 + i * 8); c.lineTo(side * 27, -11 + i * 10); c.fill(); } }
  c.beginPath(); c.moveTo(-5, -31); c.lineTo(0, -17); c.lineTo(5, -31); c.fill();
  ellipse(c, -9, 2, 11, 10, "#fff0c9"); ellipse(c, 9, 2, 11, 10, "#fff0c9");
  ellipse(c, -10, -8, 3, 4, "#263c2b"); ellipse(c, 10, -8, 3, 4, "#263c2b");
  ellipse(c, 0, 0, 4, 3, "#573b30");
  c.restore();
}
function duck(c: CanvasRenderingContext2D, x: number, y: number, elite: boolean, time: number) {
  c.save(); c.translate(x, y + Math.sin(time * 7 + x) * 2);
  ellipse(c, 0, 17, 20, 6, "#203c2920");
  ellipse(c, -7, 15, 7, 3, "#eab151"); ellipse(c, 7, 15, 7, 3, "#eab151");
  ellipse(c, 0, 4, elite ? 22 : 18, 15, elite ? "#8c9b70" : "#fff8df");
  ellipse(c, -5, 5, 10, 7, elite ? "#687d56" : "#e4e4c8");
  ellipse(c, 7, -10, 12, 13, elite ? "#426d52" : "#fffbe8");
  ellipse(c, 19, -7, 8, 4, "#eead45"); ellipse(c, 10, -13, 2.2, 2.6, "#304735");
  c.restore();
}
export function draw(c: CanvasRenderingContext2D, run: Run, now: number) {
  c.clearRect(0, 0, WIDTH, HEIGHT);
  c.fillStyle = "#e9edce"; c.fillRect(0, 0, WIDTH, HEIGHT);
  ellipse(c, 470, 330, 405, 266, "#f0efd4");
  ellipse(c, 795, 112, 104, 56, "#cadcc3"); ellipse(c, 795, 108, 87, 44, "#abcac0");
  c.strokeStyle = "#dae7d0"; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(795, 108, 40 + i * 10, 15 + i * 5, 0, .2, 2.5); c.stroke(); }
  for (let i = 0; i < 160; i++) {
    const x = (i * 137.3 + 25) % WIDTH, y = (i * 83.7 + 20) % HEIGHT;
    c.strokeStyle = i % 3 ? "#c9d3ac" : "#bbc89d"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x, y); c.lineTo(x + 2, y - 5); c.stroke();
    if (i % 13 === 0) ellipse(c, x + 4, y, 2, 2, "#e6bc6c");
  }
  for (let i = 0; i < 38; i++) {
    const x = (i * 113) % WIDTH, y = i % 2 ? HEIGHT - (i % 4) * 9 : (i % 4) * 9;
    ellipse(c, x, y + 9, 35, 18, "#345c4220");
    ellipse(c, x - 12, y, 28, 21, "#789568"); ellipse(c, x + 11, y - 10, 26, 24, "#8fa777");
    ellipse(c, x, y - 20, 21, 19, "#a3b687");
  }
  for (const [x, y] of [[60, 160], [930, 420], [105, 480], [920, 230]]) {
    ellipse(c, x, y + 7, 27, 13, "#63775a25"); ellipse(c, x, y, 23, 17, "#a8ad93"); ellipse(c, x - 5, y - 5, 15, 10, "#c0c2a8");
  }
  const preview = run.phase === "ready";
  if (preview) {
    for (const [x, y] of [[290, 250], [710, 390], [640, 160], [360, 480], [820, 290], [190, 365]]) duck(c, x, y, false, now);
  }
  if (run.phase === "playing") {
    c.strokeStyle = "#4a715b66"; c.lineWidth = 1.5;
    c.beginPath(); c.arc(run.targetX, run.targetY, 9, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(run.targetX - 14, run.targetY); c.lineTo(run.targetX + 14, run.targetY); c.moveTo(run.targetX, run.targetY - 14); c.lineTo(run.targetX, run.targetY + 14); c.stroke();
  }
  for (const d of run.ducks) duck(c, d.x, d.y, d.elite, now);
  if (run.slash > 0) {
    c.strokeStyle = `rgba(255,255,235,${run.slash * 4})`; c.lineWidth = 9;
    c.beginPath(); c.arc(run.x, run.y, 85, now * 12, now * 12 + Math.PI * 1.6); c.stroke();
  }
  c.globalAlpha = run.invincible > 0 ? .5 + Math.sin(now * 35) * .3 : 1;
  tiger(c, run.x, run.y, 1, run.phase === "playing" ? run.time : 0); c.globalAlpha = 1;
  for (const p of run.particles) {
    c.globalAlpha = p.life / .6;
    for (let i = 0; i < 6; i++) ellipse(c, p.x + Math.cos(i) * (1 - p.life) * 35, p.y + Math.sin(i) * (1 - p.life) * 35, 3, 5, "#fffdf0");
    c.globalAlpha = 1;
  }
}
