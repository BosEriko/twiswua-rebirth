import Link from "next/link";
import styles from "./hub.module.css";

const games = [
  {
    href: "/survival",
    title: "TwisWua Survival",
    subtitle: "Survival",
    icon: "虎",
    className: styles.survivalIcon,
  },
  {
    href: "/flappy",
    title: "TwisWua Flight",
    subtitle: "Arcade",
    icon: "🐯",
    className: styles.flightIcon,
  },
];

export default function Page() {
  return (
    <main className={styles.launcher}>
      <div className={styles.wallpaper} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hillOne} />
        <span className={styles.hillTwo} />
      </div>

      <header className={styles.statusBar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>虎</span>
          <span>TwisWua&apos;s Arcade Room</span>
        </div>
        <span className={styles.status}>GAME SELECT</span>
      </header>

      <section className={styles.homeScreen}>
        <div className={styles.heading}>
          <p>WELCOME TO</p>
          <h1>TwisWua&apos;s Arcade Room</h1>
          <span>Tap an icon to play full screen.</span>
        </div>

        <div className={styles.appGrid} aria-label="Choose a game">
          {games.map((game) => (
            <Link className={styles.app} href={game.href} key={game.href}>
              <span className={`${styles.appIcon} ${game.className}`} aria-hidden="true">
                <span>{game.icon}</span>
              </span>
              <strong>{game.title}</strong>
              <small>{game.subtitle}</small>
            </Link>
          ))}
        </div>
      </section>

      <footer className={styles.dock} aria-hidden="true">
        <span />
        <span />
        <span />
      </footer>
    </main>
  );
}
