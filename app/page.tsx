import Link from "next/link";
import styles from "./hub.module.css";

const games = [
  {
    href: "/survival",
    eyebrow: "GAME 01 · ENDLESS SURVIVAL",
    title: "Tiger Tide",
    description: "Dodge the flock, sharpen your claws, and survive wave after wave of unreasonable ducks.",
    controls: "Mouse / keyboard · mobile joystick",
    mark: "虎",
  },
  {
    href: "/flappy",
    eyebrow: "GAME 02 · FOREST FLIGHT",
    title: "Tiger Flight",
    description: "Keep a tiny tiger airborne and thread the gaps between towering jungle trees.",
    controls: "Space / click · tap on mobile",
    mark: "🐯",
  },
];

export default function Page() {
  return (
    <main className={styles.hub}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>虎</span>
          <span>TIGER <i>TIDE</i></span>
        </div>
        <span className={styles.edition}>TWISWUA · FIELD GAMES</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>PICK YOUR TROUBLE</p>
        <h1>Two tiny tigers.<br /><em>Two bad ideas.</em></h1>
        <p className={styles.lede}>Choose a game and jump straight in. Every game is built to work on desktop and fill the screen comfortably on mobile.</p>
      </section>

      <section className={styles.grid} aria-label="Choose a game">
        {games.map((game) => (
          <Link className={styles.card} href={game.href} key={game.href}>
            <div className={styles.art} aria-hidden="true">
              <span>{game.mark}</span>
              <div className={styles.horizon} />
            </div>
            <div className={styles.cardBody}>
              <p className={styles.eyebrow}>{game.eyebrow}</p>
              <div className={styles.titleRow}>
                <h2>{game.title}</h2>
                <span>↗</span>
              </div>
              <p>{game.description}</p>
              <small>{game.controls}</small>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
