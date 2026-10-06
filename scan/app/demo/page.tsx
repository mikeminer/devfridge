import type { Metadata } from "next";
import styles from "./demo.module.css";

const androidVideo = "https://github.com/mikeminer/devfridge-world-android/releases/download/android-v0.3.2-beta.1/DevFridge-World-Android-Demo-2026-10-06.mp4";
const source = "https://github.com/mikeminer/devfridge-world-android";

export const metadata: Metadata = {
  title: { absolute: "DevFridge World · Android Demo" },
  description: "Actual Android emulator footage of DevFridge World: touch practice, local progress, native sharing and Solana Mobile Wallet Adapter diagnostic signing, with a readable English transcript.",
  alternates: { canonical: "https://world.devfridge.cool/demo" },
  openGraph: {
    title: "DevFridge World · Android Demo",
    description: "Recorded Android gameplay and wallet evidence, with explicit test boundaries and a readable transcript.",
    url: "https://world.devfridge.cool/demo",
    siteName: "DevFridge World",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function WorldDemoPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <a href="/game" className={styles.brand}>DEVFRIDGE WORLD</a>
          <a href="/android" className={styles.androidLink}>Android app</a>
        </header>

        <section className={styles.hero} aria-labelledby="demo-title">
          <div>
            <p className={styles.eyebrow}>ANDROID DEMO · 6 OCTOBER 2026</p>
            <h1 id="demo-title">Your meme.<br />Your fridge.<br />On Android.</h1>
            <p className={styles.lead}>Actual touch play, local progress and Solana wallet signing in DevFridge World 0.3.2-beta.1.</p>
            <p className={styles.scope}>Recorded on an Android 15 emulator. The wallet segment uses the official Solana Mobile SDK Fake Wallet with unfunded test keys.</p>
            <div className={styles.actions}>
              <a href="#android-recording" className={styles.primary}>Watch the Android demo</a>
              <a href="/android" className={styles.secondary}>Get the Android app</a>
            </div>
            <div className={styles.facts}>
              <span>Real 3D touch play</span>
              <span>Local sessions persist</span>
              <span>MWA message signature</span>
            </div>
          </div>
          <figure className={styles.videoFrame} id="android-recording">
            <video controls playsInline preload="metadata" poster="/demo-evidence/android-practice-touch.png" aria-label="DevFridge World Android emulator demonstration">
              <source src={androidVideo} type="video/mp4" />
              <a href={androidVideo}>Open the Android recording</a>
            </video>
            <figcaption>Android emulator recording · local practice and wallet diagnostic</figcaption>
            <a className={styles.smallLink} href={androidVideo}>Open the MP4 directly</a>
          </figure>
        </section>

        <section className={styles.transcript} aria-labelledby="transcript-title">
          <p className={styles.eyebrow}>ACCESSIBLE EVIDENCE</p>
          <h2 id="transcript-title">Readable English transcript</h2>
          <p className={styles.muted}>A descriptive transcript of the visible Android flows, not spoken narration.</p>
          <ol>
            <li><h3>Touch gameplay and a completed local round</h3><p>The app opens its labelled local practice mode. The real 3D fridge and physics pieces respond to touch input. A merge displays “MERGED Aperitivo” and score 20. Returning from Android Home pauses the round, which can then resume. The result reads “Practice complete” with 20 points and on-device adaptive advice. Practice has no ranking or prize claim.</p></li>
            <li><h3>Progress after reopening the app</h3><p>After the app is force-stopped and reopened, the local personal best remains 20. The native Recent sessions menu displays the completed 20-point local results and their completion times. This is progress stored on the device, not an on-chain score.</p></li>
            <li><h3>Native sharing</h3><p>The Android share chooser delivers the generated 20-point practice PNG to a local test receiving app. The receiver reads the 1080 × 1350 image through its temporary URI permission and confirms acceptance. The caption identifies local practice with no ranking or prizes. Nothing is posted externally.</p></li>
            <li><h3>Wallet authorization and exact-message signing</h3><p>A visible MWA diagnostic panel states “Not game access, a ranked score or a payment.” The official SDK Fake Wallet opens for normal account authorization, returns a connected test account, then approves one message-signing payload. The app reports a 64-byte signature. Independent Ed25519 verification of the exported public evidence returned true.</p></li>
            <li><h3>Optional SKR consent and network failure</h3><p>The native disclosure explains the read-only mainnet SKR query, RPC visibility of the public address and IP, and cosmetic-only Aurora benefit. The real query attempt ends in “SKR check unavailable” with Retry and Close because the emulator cannot resolve the RPC host. No successful balance result or perk unlock is shown.</p></li>
          </ol>
          <aside className={styles.boundary}>
            <strong>What this recording establishes</strong>
            <p>Android emulator practice, local progress and an actual SDK test-wallet message signature. The debug wallet identity warning remains visible. Live token-timelock eligibility, ranked TopShelf payment, a positive SKR balance and physical Seed Vault execution are separate, unverified flows.</p>
          </aside>
          <div className={styles.links}>
            <a href={`${source}/blob/main/ANDROID-EVIDENCE-2026-10-06.md`} target="_blank" rel="noopener noreferrer">Dated Android evidence</a>
            <a href={source} target="_blank" rel="noopener noreferrer">Source and build instructions</a>
            <a href={`${source}/blob/main/DEPENDENCY-EVIDENCE-2026-10-06.md`} target="_blank" rel="noopener noreferrer">Dependency remediation</a>
          </div>
        </section>

        <section className={styles.previous} aria-labelledby="previous-title">
          <div>
            <p className={styles.eyebrow}>EARLIER BROWSER MATERIAL</p>
            <h2 id="previous-title">Browser walkthrough</h2>
            <p>The earlier desktop/browser video shows the web game and TopShelf pages. It is background material and does not demonstrate Android MWA, native haptics or SKR behavior.</p>
          </div>
          <div className={styles.previousActions}>
            <a href="https://www.youtube.com/watch?v=BkLP8IkrDaQ" target="_blank" rel="noopener noreferrer" className={styles.secondary}>Watch the earlier browser video</a>
            <a href="/demo-player/index.html" className={styles.smallLink}>Try the earlier 60-second browser preview</a>
          </div>
        </section>

        <footer className={styles.footer}>
          <a href="/game">Play DevFridge World</a>
          <a href="/android">Android downloads and help</a>
          <a href="mailto:welcome@devfridge.cool">Contact</a>
        </footer>
      </div>
    </main>
  );
}
