import styles from './skill.module.css';

const PROGRAM = '9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6';
const EXPLORER = `https://solscan.io/account/${PROGRAM}`;
const SOURCE = 'https://github.com/mikeminer/devfridge';
const BUILD_HASH = '0043d6dabd4d8d50e6623305a12f32404e281499920a7a6478f2d6a36f60237e';

export default function ProgramStory() {
  return <section className={styles.programStory} id="fridge-program" aria-labelledby="program-story-title">
    <div className={styles.programIntro}>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>ONE ENGINE. MANY MISSIONS.</p>
        <h2 id="program-story-title">Build your game.<br/>Reuse the engine.</h2>
        <p>Think of SpaceX’s reusable rockets: the next mission builds on an engine already built. Fridge brings that reuse idea to meme games. Your AI uses the skill and SDK to connect your game to the existing Solana timelock program.</p>
        <p className={styles.note}>A reuse analogy, with no affiliation or endorsement by SpaceX or Elon Musk.</p>
      </div>
      <ol className={styles.missionFlow} aria-label="How the program is reused">
        <li><span>01 / THE ENGINE</span><strong>Fridge on Solana</strong><p>Token vaults, unlock dates and redemption rules.</p></li>
        <li><span>02 / THE CONNECTION</span><strong>SDK + AI skill</strong><p>Check the lock. Apply your game’s access policy.</p></li>
        <li><span>03 / YOUR MISSION</span><strong>Your meme. Your game.</strong><p>Runner, racer or arena: bring the character and the fun.</p></li>
      </ol>
    </div>
    <div className={styles.programIdentity}>
      <span>SOLANA MAINNET / FRIDGE PROGRAM</span>
      <a href={EXPLORER} target="_blank" rel="noopener noreferrer"><code>{PROGRAM}</code> ↗</a>
      <p>Evidence checked 22 September 2026 · Snapshot, not a live security monitor.</p>
    </div>
    <div className={styles.proofGrid}>
      <article><span className={styles.proofTag}>SECURITY.TXT: TRUE</span><h3>A contact card in the code.</h3><p>The deployed program includes security metadata: project, source, disclosure policy and contacts. Researchers can find the developer directly from the program address. TRUE means those metadata are present; it is not a safety score or audit approval.</p><a href={`${EXPLORER}#programSecurity`} target="_blank" rel="noopener noreferrer">Read the on-chain metadata ↗</a></article>
      <article><span className={styles.proofTag}>PROGRAM IS VERIFIED</span><h3>Source and deployment match.</h3><p>Solscan displays Verified Build. The verification service reports matching hashes for the executable built from source and the deployed program, linked to commit <code>292645a</code>. This is reproducible-build evidence for that version, not a guarantee of bug-free code.</p><a href={`${EXPLORER}#programVerification`} target="_blank" rel="noopener noreferrer">Compare the build hashes ↗</a></article>
      <article><span className={styles.proofTag}>DEVELOPER CHECKS</span><h3>Inspect the work behind it.</h3><p>The repository documents developer review, a Sealevel attack-pattern checklist, Rust tests, Clippy, dependency checks and Sec3 X-ray runs. These are different layers of evidence. Current security metadata say <code>auditors: None</code>; no independent audit is published.</p><a href={`${SOURCE}/blob/master/SECURITY.md`} target="_blank" rel="noopener noreferrer">Review the security record ↗</a></article>
    </div>
    <div className={styles.programDetails}>
      <details><summary>What makes Fridge reusable?</summary><p>Each Token-2022 lock records its depositor, exact mint, amount and unlock date in a distinct program account. Tokens sit in a PDA-controlled vault. A wallet can create multiple independent locks; under the current program, only the depositor can redeem after expiry. Redemption applies the documented 2% PASTA buy-and-burn fee.</p><p>Your game chooses supported tokens, thresholds, duration rules and character access. The SDK reads existing locks; the skill helps implement and test your gate. You reuse the deployed timelock infrastructure while building your own gameplay, wallet flow and score verification. Token extensions and redemption routes still need compatibility checks.</p><p>The program remains upgradeable. Check the current authority and verification after upgrades. Reusing the live program is also distinct from copying or redeploying its source, which has its own licence.</p></details>
      <details><summary>What is actually recorded on-chain?</summary><p>Program bytecode, lock accounts and transactions are on-chain. Security metadata are embedded in the program. Solana’s verified-build workflow can store repository, commit and build instructions in a verification PDA, then use a remote rebuild to compare hashes.</p><p>An audit report, a build record and a transaction receipt prove different things. The records checked here do not establish an independent audit stored on-chain. A future audit should link its author, scope, reviewed commit, report and any on-chain attestation explicitly.</p><a href="https://solana.com/docs/programs/verified-builds" target="_blank" rel="noopener noreferrer">How Solana verified builds work ↗</a></details>
      <details><summary>Open the verification receipts</summary><dl className={styles.buildReceipt}><dt>Source linked by the verifier</dt><dd><a href={`${SOURCE}/tree/292645a`} target="_blank" rel="noopener noreferrer">Commit 292645a ↗</a></dd><dt>Matching executable / on-chain hash</dt><dd><code>{BUILD_HASH}</code></dd><dt>Verifier timestamp</dt><dd>25 August 2026 · status rechecked 22 September 2026</dd></dl><a href={`https://verify.osec.io/status/${PROGRAM}`} target="_blank" rel="noopener noreferrer">Open the verification response ↗</a><p>Tests cover zero amounts, invalid unlock dates, fee arithmetic and boost configuration. The public security workflow also runs Clippy, cargo audit and X-ray when program inputs change.</p><p>The 19 September run is marked successful, but its X-ray output includes LLVM diagnostics alongside “No issues detected.” Its cargo audit configuration excludes two documented advisories, RUSTSEC-2024-0344 and RUSTSEC-2022-0093. A green workflow badge alone does not establish complete analysis or an independent audit.</p><a href={`${SOURCE}/actions/runs/35462918107`} target="_blank" rel="noopener noreferrer">Inspect the actual check logs ↗</a></details>
      <details><summary>The development effort you can reuse</summary><p>Building this foundation involves program engineering, account constraints, tests, deployment, reproducible-build verification, SDK work and ongoing maintenance. The skill makes that existing work accessible to another game without requiring its developer to start a new timelock program from scratch.</p><p>No substantiated total for development or external audit expenditure is published in the sources reviewed here. Network fees and rent balances are not a development invoice. Reuse can avoid duplicated work; it does not remove your game’s integration, testing, hosting or security-review costs.</p></details>
    </div>
    <div className={styles.exploreProgram}>
      <div><h3>Open the fridge. Follow the evidence.</h3><p>Use DevFridge’s visual interface to explore locks, amounts, unlock dates and transaction links. Open Solscan’s Program IDL, Accounts Data, Verification and Security tabs for the technical details. No terminal needed to inspect them.</p></div>
      <div className={styles.actions}><a className={styles.primary} href="https://devfridge.cool/" target="_blank" rel="noopener noreferrer">Explore the Fridge ↗</a><a className={styles.secondary} href={`${EXPLORER}#programVerification`} target="_blank" rel="noopener noreferrer">Explore the program ↗</a></div>
    </div>
  </section>;
}
