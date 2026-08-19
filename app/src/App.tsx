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
import Fridge from "./components/Fridge";
import FundDeploy from "./components/FundDeploy";
import StockPanel from "./components/StockPanel";
import TokenLogo from "./components/TokenLogo";
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

  const [open, setOpen] = useState(true);
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

  useEffect(() => {
    setNeedsGraduation(false);
    if (!selected || selected.mint.equals(PASTA_MINT)) return;
    const mint = selected.mint.toBase58();
    let cancelled = false;
    void isOnPumpBondingCurve(mint).then((onCurve) => {
      if (!cancelled) setNeedsGraduation(onCurve);
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, []);

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

  const refreshLocks = useCallback(async () => {
    const net = cluster;
    setLoadingLocks(true);
    setLocks([]);
    setSelectedId(null);
    try {
      const raw = await fetchAllLocks(connection, programId, net);
      if (clusterRef.current !== net) return;
      const decorated = await decorateLocks(connection, raw);
      if (clusterRef.current !== net) return;
      const withSigs = await attachLockSignatures(connection, decorated, net);
      if (clusterRef.current !== net) return;
      setLocks(withSigs);
    } catch {
      if (clusterRef.current !== net) return;
      setLocks([]);
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
      if (!wasOpen) void refreshLocks();
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
      await refreshLocks();
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
      const tx = await claimTransaction(connection, owner, lock, programId);
      const sig = await wallet.sendTransaction(tx);
      await confirmSignature(connection, sig);
      forgetLock(lock.address.toBase58(), cluster);
      setStatus({
        kind: "ok",
        text: `Took ${lock.symbol} out of the fridge.`,
        receipt: explorerTxUrl(cluster, sig),
      });
      setSelectedId(null);
      await refreshLocks();
      void sig;
    } catch (err) {
      setStatus({ kind: "bad", text: err instanceof Error ? err.message : String(err) });
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
          <a href="#tokenomics" onClick={() => setMenuOpen(false)}>
            $PASTA tokenomics
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
          <button className="ghost" type="button" onClick={() => void refreshLocks()}>
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
              {needsGraduation && (
                <div className="banner warn">{BUYBACK_GRADUATION_WARNING}</div>
              )}
              <button
                className="primary"
                type="button"
                disabled={
                  busy ||
                  !owner ||
                  !owner.equals(selected.depositor) ||
                  now < selected.unlockAt
                }
                onClick={() => void onClaim(selected)}
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

      <section className="tokenomics" id="tokenomics">
        <p className="eyebrow">$PASTA</p>
        <h2>Tokenomics</h2>
        <p className="lede coming-soon">Coming soon.</p>
        <p className="lede">
          Stay updated: follow the dev on X and turn on notifications. Follow the
          dev on pump.fun and turn on notifications there too.
        </p>
        <div className="tokenomics-actions">
          <a className="ghost" href={DEV_X_URL} target="_blank" rel="noreferrer">
            Follow on X · @anonimocommando
          </a>
          <a className="ghost" href={DEV_PUMP_URL} target="_blank" rel="noreferrer">
            Follow on pump.fun
          </a>
        </div>
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
