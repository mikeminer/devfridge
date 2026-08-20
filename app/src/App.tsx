import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BUYBACK_GRADUATION_WARNING,
  CLUSTERS,
  DEV_PUMP_URL,
  DEV_X_URL,
  GITHUB_REPO,
  LICENSE_URL,
  PASTA_MINT,
  PASTA_URL,
  TRUST_ME_VAULT,
  TRUST_ME_VAULT_URL,
  explorerProgramUrl,
  explorerTxUrl,
  type ClusterName,
} from "./lib/constants";
import { usePhantom } from "./hooks/usePhantom";
import {
  type MintInfo,
  claimTransaction,
  confirmSignature,
  createLockTransaction,
  fetchAllLocks,
  fetchMintInfo,
  formatAmount,
  formatWhen,
  lockPda,
  nextLockId,
  parseAmount,
  redemptionFee,
} from "./lib/fridge";
import { forgetLock, rememberLock } from "./lib/lockIndex";
import {
  type DecoratedLock,
  attachLockSignatures,
  decorateLocks,
  fetchTokenVisual,
  isOnPumpBondingCurve,
  remainingLabel,
} from "./lib/tokenMeta";
import { useAppState } from "./state";
import Cooker, { type CookedMint } from "./components/Cooker";
import Fridge from "./components/Fridge";
import FundDeploy from "./components/FundDeploy";
import StockPanel from "./components/StockPanel";
import TokenLogo from "./components/TokenLogo";
import { createMemeMintTransaction, formatSendError } from "./lib/cooker";
import logoMark from "./assets/logo-mark.jpg";
import logoWordmark from "./assets/logo-wordmark.jpg";

function CopyableMint({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy mint", value);
    }
  }
  return (
    <button type="button" className="copy-mint mono" onClick={() => void copy()}>
      <span>{value}</span>
      <em>{copied ? "copied" : "copy"}</em>
    </button>
  );
}

function toLocalInput(unix: number): string {
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function App() {
  const {
    cluster,
    setCluster,
    programId,
    endpoint,
  } = useAppState();
  const wallet = usePhantom(endpoint);
  const connection = wallet.connection;

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mintInput, setMintInput] = useState("");
  const [mintInfo, setMintInfo] = useState<(MintInfo & { image?: string | null }) | null>(
    null
  );
  const [mintError, setMintError] = useState("");
  const [amount, setAmount] = useState("");
  const [unlockLocal, setUnlockLocal] = useState(() =>
    toLocalInput(Math.floor(Date.now() / 1000) + 86400)
  );
  const [locks, setLocks] = useState<DecoratedLock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<{
    kind: "ok" | "bad" | "warn";
    text: string;
    receipt?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingLocks, setLoadingLocks] = useState(true);
  const [now, setNow] = useState(() => Date.now() / 1000);

  const owner = wallet.publicKey;
  const selected = locks.find((l) => l.address.toBase58() === selectedId) ?? null;
  const [needsGraduation, setNeedsGraduation] = useState(false);
  const [cookError, setCookError] = useState("");
  const [cooked, setCooked] = useState<CookedMint | null>(null);
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    setNeedsGraduation(false);
    if (cluster !== "mainnet") return;
    if (!selected || selected.mint.equals(PASTA_MINT)) return;
    const mint = selected.mint.toBase58();
    let cancelled = false;
    void isOnPumpBondingCurve(mint).then((onCurve) => {
      if (!cancelled) setNeedsGraduation(onCurve);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, cluster]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() / 1000), 5000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setCooked(null);
    setCookError("");
  }, [cluster]);


  const loadMint = useCallback(async () => {
    if (!owner) {
      setMintError("Connect Phantom first");
      return;
    }
    setMintError("");
    setMintInfo(null);
    try {
      const info = await fetchMintInfo(connection, mintInput, owner);
      const visual = await fetchTokenVisual(connection, info.mint);
      setMintInfo({
        ...info,
        name: visual.name,
        symbol: visual.symbol,
        decimals: visual.decimals,
        image: visual.image,
      });
      if (info.nonTransferable) {
        setMintError("This mint is non-transferable and cannot be locked");
      }
    } catch (err) {
      setMintError(err instanceof Error ? err.message : String(err));
    }
  }, [connection, mintInput, owner]);

  const clusterRef = useRef(cluster);
  clusterRef.current = cluster;

  const refreshLocks = useCallback(async (opts?: { keep?: boolean }) => {
    const net = cluster;
    setLoadingLocks(true);
    setScanError("");
    if (!opts?.keep) {
      setLocks([]);
      setSelectedId(null);
    }
    try {
      const raw = await fetchAllLocks(connection, programId, net);
      if (clusterRef.current !== net) return;
      const decorated = await decorateLocks(connection, raw);
      if (clusterRef.current !== net) return;
      const withSigs = await attachLockSignatures(connection, decorated, net);
      if (clusterRef.current !== net) return;
      setLocks(withSigs);
      setScanError("");
    } catch (err) {
      if (clusterRef.current !== net) return;
      setScanError(err instanceof Error ? err.message : String(err));
      if (!opts?.keep) setLocks([]);
    } finally {
      if (clusterRef.current === net) setLoadingLocks(false);
    }
  }, [cluster, connection, programId]);

  useEffect(() => {
    setMintInfo(null);
    setStatus(null);
    void refreshLocks();
  }, [cluster, refreshLocks]);

  function toggleDoor() {
    setOpen((wasOpen) => {
      if (!wasOpen) void refreshLocks({ keep: true });
      return !wasOpen;
    });
  }

  const unlockUnix = useMemo(() => {
    const t = Date.parse(unlockLocal);
    return Number.isNaN(t) ? 0 : Math.floor(t / 1000);
  }, [unlockLocal]);

  async function onCreate() {
    if (!owner || !wallet.sendTransaction) {
      setStatus({ kind: "bad", text: "Connect Phantom to stock the fridge" });
      return;
    }
    if (!mintInfo) {
      setStatus({ kind: "bad", text: "Look up a Token-2022 mint first" });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const rawAmount = parseAmount(amount, mintInfo.decimals);
      if (rawAmount > mintInfo.balance) throw new Error("Amount exceeds your balance");
      if (unlockUnix <= Math.floor(Date.now() / 1000)) {
        throw new Error("Unlock time must be in the future");
      }
      const lockId = await nextLockId(connection, owner, mintInfo.mint, programId);
      const tx = await createLockTransaction(
        connection,
        owner,
        mintInfo.mint,
        rawAmount,
        BigInt(unlockUnix),
        lockId,
        programId
      );
      const sig = await wallet.sendTransaction(tx);
      await confirmSignature(connection, sig);
      const [lockAddress] = lockPda(owner, mintInfo.mint, lockId, programId);
      rememberLock({
        address: lockAddress.toBase58(),
        mint: mintInfo.mint.toBase58(),
        lockId: lockId.toString(),
        depositor: owner.toBase58(),
        programId: programId.toBase58(),
        cluster,
        signature: sig,
      });
      setStatus({
        kind: "ok",
        text: `Chilled ${amount} ${mintInfo.symbol} until ${formatWhen(unlockUnix)}.`,
        receipt: explorerTxUrl(cluster, sig),
      });
      setAmount("");
      setOpen(true);
      const info = await fetchMintInfo(connection, mintInfo.mint.toBase58(), owner);
      const visual = await fetchTokenVisual(connection, info.mint);
      setMintInfo({ ...info, image: visual.image });
      await refreshLocks({ keep: true });
      void sig;
    } catch (err) {
      setStatus({ kind: "bad", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onClaim(lock: DecoratedLock) {
    if (!owner || !wallet.sendTransaction) return;
    setBusy(true);
    setStatus(null);
    try {
      const tx = await claimTransaction(connection, owner, lock, programId, {
        localFeeBurn: cluster !== "mainnet",
      });
      const sig = await wallet.sendTransaction(tx);
      await confirmSignature(connection, sig);
      forgetLock(lock.address.toBase58(), cluster);
      setStatus({
        kind: "ok",
        text:
          cluster === "mainnet"
            ? `Took ${lock.symbol} out of the fridge.`
            : `Took ${lock.symbol} out. 2% of this token was burned on ${CLUSTERS[cluster].label} (Jupiter $PASTA buyback is mainnet-only).`,
        receipt: explorerTxUrl(cluster, sig),
      });
      setSelectedId(null);
      await refreshLocks({ keep: true });
      void sig;
    } catch (err) {
      setStatus({ kind: "bad", text: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function onCookMeme(fields: { name: string; symbol: string; supply: string }) {
    if (cluster === "mainnet") return;
    setCookError("");
    if (!owner) {
      void wallet.connect();
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const { tx, mint, amount } = await createMemeMintTransaction(
        connection,
        owner,
        fields
      );
      const sig = await wallet.sendTransaction(tx, [mint]);
      await confirmSignature(connection, sig);
      const mintStr = mint.publicKey.toBase58();
      setMintInput(mintStr);
      setCooked({
        mint: mintStr,
        name: fields.name.trim(),
        symbol: fields.symbol.trim().toUpperCase(),
        signature: sig,
      });
      setStatus({
        kind: "ok",
        text: `Cooked ${fields.symbol.trim().toUpperCase()}. ${amount.toString()} base units are in your wallet.`,
        receipt: explorerTxUrl(cluster, sig),
      });
      try {
        const info = await fetchMintInfo(connection, mintStr, owner);
        setMintInfo({ ...info, image: null });
      } catch {
        /* lookup is optional after cook */
      }
    } catch (err) {
      const text = await formatSendError(err);
      setCookError(text);
      setStatus({ kind: "bad", text });
    } finally {
      setBusy(false);
    }
  }

  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const onIpfs = path.includes("/ipfs/") || path.includes(".ipfs.");
    const wantFund =
      window.location.search.includes("deploy=1") ||
      (!onIpfs && (path.endsWith("/fund") || path.endsWith("/fund.html")));
    if (wantFund) return <FundDeploy />;
  }

  return (
    <div className="app kitchen">
      <div className="moon" />
      <div className="window-light" />

      <header className="topbar">
        <div className="brand">
          <img className="logo-img" src={logoMark} alt="DevFridge" />
          <div>
            <h1>DevFridge</h1>
            <p>Too many tokens? Fridge them.</p>
          </div>
        </div>
        <button
          className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i />
          <i />
          <i />
        </button>
        <nav className={`site-nav ${menuOpen ? "is-open" : ""}`}>
          <a href="#fridge" onClick={() => setMenuOpen(false)}>
            Fridge
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            What is DevFridge
          </a>
          <a href="#tokenomics" onClick={() => setMenuOpen(false)}>
            $PASTA tokenomics
          </a>
          <a href="#roadmap" onClick={() => setMenuOpen(false)}>
            Roadmap
          </a>
          <a href={DEV_X_URL} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
            Follow on X
          </a>
          <a href={DEV_PUMP_URL} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
            Follow on pump.fun
          </a>
        </nav>
        <div className="controls">
          <select
            className="cluster"
            value={cluster}
            onChange={(e) => setCluster(e.target.value as ClusterName)}
          >
            {(Object.keys(CLUSTERS) as ClusterName[]).map((name) => (
              <option key={name} value={name}>
                {CLUSTERS[name].label}
              </option>
            ))}
          </select>
          <button className="ghost" type="button" onClick={() => void refreshLocks({ keep: true })}>
            {loadingLocks ? "Scanning…" : "Refresh"}
          </button>
          {wallet.connected ? (
            <span className="mono muted">
              {wallet.publicKey?.toBase58().slice(0, 4)}…{wallet.publicKey?.toBase58().slice(-4)}
            </span>
          ) : (
            <button className="ghost" type="button" onClick={() => void wallet.connect()}>
              Connect Phantom
            </button>
          )}
        </div>
      </header>

      {status && (
        <div className={`banner ${status.kind} toast`}>
          <span>{status.text}</span>
          {status.receipt && (
            <a
              className="receipt mono"
              href={status.receipt}
              target="_blank"
              rel="noreferrer"
            >
              Receipt {status.receipt.split("/tx/")[1]?.split("?")[0]}
            </a>
          )}
        </div>
      )}

      <div className="stage" id="fridge">
        <StockPanel
          clusterLabel={CLUSTERS[cluster].label}
          connected={Boolean(owner)}
          mintInput={mintInput}
          onMintInput={setMintInput}
          onLookup={() => void loadMint()}
          mintInfo={mintInfo}
          mintError={mintError}
          amount={amount}
          onAmount={setAmount}
          unlockLocal={unlockLocal}
          onUnlockLocal={setUnlockLocal}
          onPreset={(seconds) =>
            setUnlockLocal(toLocalInput(Math.floor(Date.now() / 1000) + seconds))
          }
          busy={busy}
          onCreate={() => void onCreate()}
        />

        <Fridge
          key={cluster}
          open={open}
          onToggle={toggleDoor}
          locks={locks}
          selected={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            if (id && !open) setOpen(true);
          }}
          now={now}
          loading={loadingLocks}
          scanError={scanError}
          serial={programId.toBase58()}
          serialLabel={CLUSTERS[cluster].label}
          serialHref={explorerProgramUrl(cluster, programId.toBase58())}
        />

        <aside className="inspect">
          {selected ? (
            <>
              <p className="eyebrow">On the shelf</p>
              <div className="inspect-logo">
                <TokenLogo src={selected.image} symbol={selected.symbol} />
              </div>
              <h3>
                {selected.symbol}
                <span> #{selected.lockId.toString()}</span>
              </h3>
              <p className="muted">{selected.name}</p>
              <dl>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatAmount(selected.amount, selected.decimals)}</dd>
                </div>
                <div>
                  <dt>You receive</dt>
                  <dd>
                    {formatAmount(
                      selected.amount - redemptionFee(selected.amount),
                      selected.decimals
                    )}
                  </dd>
                </div>
                <div>
                  <dt>2% buy & burn</dt>
                  <dd>
                    {formatAmount(redemptionFee(selected.amount), selected.decimals)}{" "}
                    {selected.mint.equals(PASTA_MINT)
                      ? "PASTA burned"
                      : "swapped to PASTA and burned"}
                  </dd>
                </div>
                <div>
                  <dt>Unlocks</dt>
                  <dd>{formatWhen(selected.unlockAt)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{remainingLabel(selected.unlockAt, now)}</dd>
                </div>
                <div>
                  <dt>Mint</dt>
                  <dd>
                    <CopyableMint value={selected.mint.toBase58()} />
                  </dd>
                </div>
                <div>
                  <dt>Lock tx</dt>
                  <dd>
                    {selected.signature ? (
                      <a
                        className="mono"
                        href={explorerTxUrl(cluster, selected.signature)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selected.signature}
                      </a>
                    ) : (
                      <span className="muted">Looking up…</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>S/N {CLUSTERS[cluster].label}</dt>
                  <dd>
                    <a
                      className="mono"
                      href={explorerProgramUrl(cluster, programId.toBase58())}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {programId.toBase58()}
                    </a>
                  </dd>
                </div>
              </dl>
              {cluster !== "mainnet" && (
                <div className="banner warn">
                  On {CLUSTERS[cluster].label}, Take it out burns 2% of this
                  token in place. Jupiter has no $PASTA route here — the 2%
                  buy-and-burn of $PASTA is mainnet-only.
                </div>
              )}
              {needsGraduation && (
                <div className="banner warn">{BUYBACK_GRADUATION_WARNING}</div>
              )}
              <button
                className="primary"
                type="button"
                disabled={
                  busy ||
                  (owner != null &&
                    (!owner.equals(selected.depositor) || now < selected.unlockAt))
                }
                onClick={() => {
                  if (!owner) void wallet.connect();
                  else void onClaim(selected);
                }}
              >
                {!owner
                  ? "Connect to claim"
                  : !owner.equals(selected.depositor)
                    ? "Not your lock"
                    : now < selected.unlockAt
                      ? "Still frozen"
                      : "Take it out"}
              </button>
            </>
          ) : (
            <>
              <p className="eyebrow">Inside</p>
              <h3>{open ? "Browse the shelves" : "The door is closed"}</h3>
              <p className="lede">
                {loadingLocks
                  ? `Chilling ${CLUSTERS[cluster].label}…`
                  : scanError
                    ? scanError
                    : locks.length
                    ? `${locks.length} live lock${locks.length === 1 ? "" : "s"} on-chain. Click a jar.`
                    : "Shelves are empty. Nothing is locked in DevFridge right now."}
              </p>
              <p className="serial-inline">
                <span className="eyebrow">S/N {CLUSTERS[cluster].label}</span>
                <a
                  className="mono"
                  href={explorerProgramUrl(cluster, programId.toBase58())}
                  target="_blank"
                  rel="noreferrer"
                >
                  {programId.toBase58()}
                </a>
              </p>
              <button className="ghost" type="button" onClick={toggleDoor}>
                {open ? "Close door" : "Open door"}
              </button>
            </>
          )}
        </aside>
      </div>

      {cluster !== "mainnet" && (
        <Cooker
          clusterLabel={CLUSTERS[cluster].label}
          connected={Boolean(owner)}
          busy={busy}
          error={cookError}
          cooked={cooked}
          mintHref={(mint) => explorerProgramUrl(cluster, mint)}
          txHref={(signature) => explorerTxUrl(cluster, signature)}
          onConnect={() => void wallet.connect()}
          onCook={(fields) => void onCookMeme(fields)}
          onUseInFridge={(mint) => {
            setMintInput(mint);
            document.getElementById("fridge")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

      <section className="about" id="about">
        <p className="eyebrow">The club</p>
        <h2>What is DevFridge?</h2>
        <div className="about-copy">
          <p>
            Most people hunting low-cap memes are looking for the same thing:
            early tokens without digging through endless noise.
          </p>
          <p>
            The problem is that deploying on Pump.fun takes seconds. That tells
            you almost nothing about the person behind the token. A transfer to
            another wallet tells you even less. If the founder still holds those
            wallets, it only looks like they sold or distributed. They didn&apos;t.
            DevFridge adds another layer.
          </p>
          <p>
            It&apos;s a place for creators who can actually build, experiment
            with dApps and put part of their own Token-2022 supply behind a
            transparent on-chain commitment — instead of hopping bags across
            wallets they still control.
          </p>
          <p>
            You don&apos;t hide the bag. You put it on a shelf. Time-locked.
            Public countdown. Anyone can verify it on-chain and inside the dapp.
          </p>
          <p>
            You bring your token into the Fridge. You lock part of the supply.
            Your project becomes discoverable inside DevFridge.
          </p>
          <p>
            And that&apos;s where the interesting part starts. DevFridge
            isn&apos;t supposed to be another token directory. It&apos;s a club.
          </p>
          <p>
            Creators post what they&apos;re building. Communities discover each
            other. Users can browse tokens already inside the Fridge, including
            tiny projects still working their way through the bonding curve.
          </p>
          <p>
            Instead of thousands of isolated launches fighting for attention,
            DevFridge creates a smaller ecosystem where builders and communities
            can actually find each other.
          </p>
          <p>
            The lock becomes part commitment, part discovery mechanism.
          </p>
          <p>A creator can basically say:</p>
          <blockquote>
            Here&apos;s my token. Here&apos;s how much of my own supply I put in
            the Fridge. Here&apos;s when it unlocks. Verify it yourself.
          </blockquote>
          <p>
            That makes DevFridge something creators can promote inside their own
            communities too. Not &quot;trust me, I didn&apos;t sell.&quot; A
            lock you can open and inspect.
          </p>
          <p>
            Our tokens are in the Fridge. Someone arriving to inspect one
            project can naturally discover the others.
          </p>
          <p>
            Promotion inside the club is not another shill thread. Got a meme
            still on the bonding curve? Freeze a slice in a time-lock. Then
            promote the Fridge itself — one hub where multiple communities skip
            the pump.fun noise and actually find each other.
          </p>
          <p>
            When your community graduates your token, they also meet the other
            listings on the shelf. Your token. Ours. Every project already in
            the Fridge. We promote the kitchen, not a single launch.
          </p>
          <p>And underneath all of this sits $PASTA — the first proof of the club.</p>
          <p>
            Instead of transferring the remaining founder bag to other wallets,
            the supply still in the founder&apos;s hands was bought and
            time-locked in the Fridge: 10% of supply, one year, verifiable
            on-chain and on the shelf.
          </p>
          <p>
            Creators can lock some of their best Token-2022 projects through the
            official dApp at{" "}
            <a href="https://devfridge.cool/" rel="noreferrer">
              devfridge.cool
            </a>
            . A portion of DevFridge&apos;s redeem fees (currently designed as a
            2% fee) feeds back into the ecosystem through $PASTA buy-and-burn.
          </p>
          <p>
            So $PASTA is not just another token sitting next to DevFridge.
          </p>
          <ol className="loop">
            <li>$PASTA is building the Fridge.</li>
            <li>The Fridge attracts builders.</li>
            <li>Builders lock a slice and bring their communities.</li>
            <li>Communities promote the hub, not only their own token.</li>
            <li>Graduation of one listing pulls eyes onto the whole shelf.</li>
          </ol>
          <p>That&apos;s the loop.</p>
          <p className="loop-end">
            Less noise. More builders. More on-chain commitment.
          </p>
          <p className="welcome">Welcome to the Fridge.</p>
        </div>
        <div className="about-actions">
          <a href="#fridge">Open the Fridge</a>
          <a href={PASTA_URL} target="_blank" rel="noreferrer">
            $PASTA on pump.fun
          </a>
        </div>
      </section>

      <section className="tokenomics" id="tokenomics">
        <p className="eyebrow">$PASTA</p>
        <h2>Tokenomics</h2>
        <p className="lede">
          $PASTA is the official dev token of pappardelle (anonimocommando) on
          Solana. It is designed as a long-term store of value: a deflationary
          engine plus a multi-source revenue flywheel that compounds as the
          Fridge gets used.
        </p>

        <div className="pasta-magnets" aria-label="$PASTA identity">
          <article className="magnet">
            <span>Name</span>
            <strong>$PASTA</strong>
          </article>
          <article className="magnet">
            <span>Chain</span>
            <strong>Solana</strong>
          </article>
          <article className="magnet">
            <span>Role</span>
            <strong>Dev token / store of value</strong>
          </article>
          <article className="magnet">
            <span>Issuer</span>
            <strong>pappardelle.eth</strong>
          </article>
        </div>
        <p className="pasta-mint-card mono">
          <span>Mint</span>
          <a href={PASTA_URL} target="_blank" rel="noreferrer">
            {PASTA_MINT.toBase58()}
          </a>
        </p>

        <h3>The Fridge is the burn engine</h3>
        <p className="lede">
          Anyone can lock a Token-2022 meme in the Fridge. You do not need $PASTA
          to operate it. On redeem, a 2% fee is taken from the locked tokens and
          Jupiter-swapped into $PASTA, then burned. More Fridge usage → more
          burns → more scarcity.
        </p>
        <ol className="flywheel" aria-label="$PASTA flywheel">
          <li>
            <i>1</i>
            <strong>Lock</strong>
            <span>Token-2022 memes go on the shelf with a public unlock time.</span>
          </li>
          <li>
            <i>2</i>
            <strong>Redeem</strong>
            <span>When the timer hits, take them out. The 2% fee is automatic.</span>
          </li>
          <li>
            <i>3</i>
            <strong>Buy</strong>
            <span>That fee is swapped on Jupiter into $PASTA.</span>
          </li>
          <li>
            <i>4</i>
            <strong>Burn</strong>
            <span>$PASTA is burned. Supply shrinks with every unlock.</span>
          </li>
        </ol>

        <h3>Revenue flywheel</h3>
        <div className="revenue-grid">
          <article className="fly-jar">
            <p className="fly-jar-lid">Fridge redemptions</p>
            <h4>2% buy &amp; burn</h4>
            <p>
              Every meme redeemed from the Fridge funds an automatic $PASTA buy
              and burn. The Fridge is powered by $PASTA; $PASTA is not required
              to lock.
            </p>
          </article>
          <article className="fly-jar">
            <p className="fly-jar-lid">Founder locks</p>
            <h4>Public tranches</h4>
            <p>
              The founding allocation sits in the Fridge with on-chain
              countdowns. When a tranche is claimed, 2% is burned. A portion of
              each unlock covers project expenses and community bounties on
              pump.fun.
            </p>
          </article>
          <article className="fly-jar">
            <p className="fly-jar-lid">Protocol volume</p>
            <h4>Buyback + re-lock</h4>
            <p>
              A share of protocol volume fees is allocated to $PASTA buybacks
              and Fridge locks. Bought-back tokens are locked rather than burned
              immediately, stretching the deflationary timeline.
            </p>
          </article>
          <article className="fly-jar">
            <p className="fly-jar-lid">Trust Me Capital</p>
            <h4>Hyperliquid vault</h4>
            <p>
              A live 24/7 perpetuals vault. Anyone can deposit — no lock-up. The
              vault keeps 10% of depositor P&amp;L. Trading revenue is
              periodically directed into $PASTA buybacks.
            </p>
            <a
              className="fly-jar-link mono"
              href={TRUST_ME_VAULT_URL}
              target="_blank"
              rel="noreferrer"
            >
              {TRUST_ME_VAULT}
            </a>
          </article>
        </div>

        <h3>Pump.fun launches</h3>
        <p className="lede">
          The dev and community periodically launch new memes on pump.fun. Each
          launch is a catalyst: volume on pump.fun, locks in the Fridge,
          redemption fees, then another $PASTA burn. Community activity
          directly reduces supply.
        </p>

        <h3>Deflationary summary</h3>
        <div className="receipt" role="table" aria-label="Deflationary summary">
          <div className="receipt-head" role="row">
            <span>Mechanism</span>
            <span>Trigger</span>
            <span>Effect on $PASTA</span>
          </div>
          <div className="receipt-row" role="row">
            <strong>Fridge redemption fee</strong>
            <span>Any meme redeemed</span>
            <span>2% auto buy &amp; burn</span>
          </div>
          <div className="receipt-row" role="row">
            <strong>Dev lock tranche</strong>
            <span>Periodic unlock cycle</span>
            <span>2% of tranche burned</span>
          </div>
          <div className="receipt-row" role="row">
            <strong>Protocol revenue</strong>
            <span>Volume on protocol</span>
            <span>Buyback + Fridge lock</span>
          </div>
          <div className="receipt-row" role="row">
            <strong>Trust Me Capital vault</strong>
            <span>24/7 trading P&amp;L</span>
            <span>Buyback, ongoing</span>
          </div>
          <p className="receipt-foot">Official tokenomics · posted on X</p>
        </div>

        <div className="tokenomics-actions">
          <a href={PASTA_URL} target="_blank" rel="noreferrer">
            $PASTA on pump.fun
          </a>
          <a href={DEV_X_URL} target="_blank" rel="noreferrer">
            Follow on X · @anonimocommando
          </a>
          <a href={DEV_PUMP_URL} target="_blank" rel="noreferrer">
            Follow on pump.fun
          </a>
        </div>
      </section>

      <section className="roadmap" id="roadmap">
        <p className="eyebrow">Kitchen plan</p>
        <h2>Roadmap</h2>
        <p className="lede">
          What is already in the Fridge, and what goes on the counter next.
        </p>
        <ol className="timeline">
          <li className="is-done">
            <p className="tl-badge">Done</p>
            <h3>Fridge program live</h3>
            <p>
              Anchor 0.30.1 Token-2022 time-lock on Solana mainnet, devnet and
              testnet. Same program ID on every cluster.
            </p>
          </li>
          <li className="is-done">
            <p className="tl-badge">Done</p>
            <h3>dApp at devfridge.cool</h3>
            <p>
              Phantom Chrome frontend. Live on-chain locks, listings isolated by
              network, token logos, cooker for Token-2022 memes on
              devnet/testnet.
            </p>
          </li>
          <li className="is-done">
            <p className="tl-badge">Done</p>
            <h3>2% buy &amp; burn</h3>
            <p>
              Redeem fee is Jupiter-swapped into $PASTA and burned. Not sent to
              a wallet. Ungraduated pump.fun tokens wait until PumpSwap for a
              route.
            </p>
          </li>
          <li className="is-done">
            <p className="tl-badge">Done</p>
            <h3>Open source &amp; IDL</h3>
            <p>
              GitHub mikeminer/devfridge under BUSL-1.1. On-chain IDL on mainnet
              and devnet. Serial plate on the fridge door is the full program ID.
            </p>
          </li>
          <li className="is-done">
            <p className="tl-badge">Done</p>
            <h3>$PASTA tokenomics on-site</h3>
            <p>
              Flywheel, founder locks, protocol buybacks and the Trust Me
              Capital vault, published from the official X post.
            </p>
          </li>
          <li className="tl-split" aria-hidden="true">
            <span>Next on the counter</span>
          </li>
          <li className="is-next">
            <p className="tl-badge">Next</p>
            <h3>Freeze the program</h3>
            <p>
              When the Fridge is stable, upgrade authority is removed for good.
              That makes the on-chain program immutable. Not frozen yet — freeze
              is one-way.
            </p>
          </li>
          <li className="is-next">
            <p className="tl-badge">Next</p>
            <h3>Telegram group</h3>
            <p>
              A public Telegram group for builders and communities already in
              the Fridge — locks, launches, and day-to-day kitchen talk.
            </p>
          </li>
          <li className="is-next">
            <p className="tl-badge">Next</p>
            <h3>Telegram channel</h3>
            <p>
              An official Telegram channel for announcements: unlocks, bounties,
              new listings, and Fridge releases.
            </p>
          </li>
          <li className="is-next">
            <p className="tl-badge">Next</p>
            <h3>Bounties on pump.fun</h3>
            <p>
              Community bounties funded from founder unlocks: builders, memes,
              and Fridge integrations paid on pump.fun.
            </p>
          </li>
          <li className="is-next">
            <p className="tl-badge">Next</p>
            <h3>App-discovery campaigns</h3>
            <p>
              List and campaign DevFridge on app-discovery platforms so builders
              and communities can find the Fridge without hunting through noise.
            </p>
          </li>
          <li className="is-next">
            <p className="tl-badge">Next</p>
            <h3>$PASTA promotions on DEXes</h3>
            <p>
              Run $PASTA promo campaigns on DEX venues so traders find the
              token where they already swap — not only inside the Fridge.
            </p>
          </li>
        </ol>
      </section>

      <footer className="powered">
        <img className="wordmark" src={logoWordmark} alt="DevFridge" />
        <a href={PASTA_URL} target="_blank" rel="noreferrer">
          powered by $PASTA
        </a>
        <a
          className="pasta-mint mono"
          href={PASTA_URL}
          target="_blank"
          rel="noreferrer"
        >
          {PASTA_MINT.toBase58()}
        </a>
        <a href={GITHUB_REPO} target="_blank" rel="noreferrer">
          github.com/mikeminer/devfridge
        </a>
        <p className="legal">
          © 2026 mikeminer. DevFridge name, brand and logo are included.
          <br />
          License:{" "}
          <a href={LICENSE_URL} target="_blank" rel="noreferrer">
            Business Source License 1.1
          </a>{" "}
          (converts to GPL-2.0-or-later on 2030-08-18).
        </p>
      </footer>
    </div>
  );
}
