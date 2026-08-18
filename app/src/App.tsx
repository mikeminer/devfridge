import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CLUSTERS,
  PASTA_MINT,
  PASTA_URL,
  explorerProgramUrl,
  type ClusterName,
} from "./lib/constants";
import { usePhantom } from "./hooks/usePhantom";
import {
  type MintInfo,
  claimTransaction,
  createLockTransaction,
  fetchAllLocks,
  fetchMintInfo,
  formatAmount,
  formatWhen,
  lockPda,
  nextLockId,
  parseAmount,
  redemptionFee,
  shortKey,
} from "./lib/fridge";
import { forgetLock, rememberLock } from "./lib/lockIndex";
import {
  type DecoratedLock,
  decorateLocks,
  fetchTokenVisual,
  remainingLabel,
} from "./lib/tokenMeta";
import { useAppState } from "./state";
import Fridge from "./components/Fridge";
import FundDeploy from "./components/FundDeploy";
import StockPanel from "./components/StockPanel";
import TokenLogo from "./components/TokenLogo";
import logoMark from "./assets/logo-mark.jpg";
import logoWordmark from "./assets/logo-wordmark.jpg";

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
  const [status, setStatus] = useState<{ kind: "ok" | "bad" | "warn"; text: string } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [loadingLocks, setLoadingLocks] = useState(true);
  const [now, setNow] = useState(() => Date.now() / 1000);

  const owner = wallet.publicKey;
  const selected = locks.find((l) => l.address.toBase58() === selectedId) ?? null;

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

  const refreshLocks = useCallback(async (silent = false) => {
    const net = cluster;
    if (!silent) {
      setLoadingLocks(true);
      setLocks([]);
      setSelectedId(null);
    }
    try {
      const raw = await fetchAllLocks(connection, programId, net);
      if (clusterRef.current !== net) return;
      setLocks(
        raw.map((lock) => ({
          ...lock,
          name: "Token-2022",
          symbol: lock.mint.toBase58().slice(0, 4),
          decimals: 6,
          image: null,
          ready: Date.now() / 1000 >= lock.unlockAt,
        }))
      );
      setLoadingLocks(false);
      const decorated = await decorateLocks(connection, raw);
      if (clusterRef.current !== net) return;
      setLocks(decorated);
    } catch {
      if (clusterRef.current !== net) return;
      if (!silent) setLocks([]);
      setLoadingLocks(false);
    }
  }, [cluster, connection, programId]);

  useEffect(() => {
    setLoadingLocks(true);
    setLocks([]);
    setSelectedId(null);
    setMintInfo(null);
    setStatus(null);
    void refreshLocks(false);
    const id = window.setInterval(() => void refreshLocks(true), 20000);
    return () => window.clearInterval(id);
  }, [cluster, refreshLocks]);

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
      await connection.confirmTransaction(sig, "confirmed");
      const [lockAddress] = lockPda(owner, mintInfo.mint, lockId, programId);
      rememberLock({
        address: lockAddress.toBase58(),
        mint: mintInfo.mint.toBase58(),
        lockId: lockId.toString(),
        depositor: owner.toBase58(),
        programId: programId.toBase58(),
        cluster,
      });
      setStatus({
        kind: "ok",
        text: `Chilled ${amount} ${mintInfo.symbol} until ${formatWhen(unlockUnix)}.`,
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
      await connection.confirmTransaction(sig, "confirmed");
      forgetLock(lock.address.toBase58(), cluster);
      setStatus({ kind: "ok", text: `Took ${lock.symbol} out of the fridge.` });
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

      {status && <div className={`banner ${status.kind} toast`}>{status.text}</div>}

      <div className="stage">
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
          onToggle={() => setOpen((v) => !v)}
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
                  <dd className="mono">{shortKey(selected.mint)}</dd>
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
              <button className="ghost" type="button" onClick={() => setOpen((v) => !v)}>
                {open ? "Close door" : "Open door"}
              </button>
            </>
          )}
        </aside>
      </div>

      <footer className="powered">
        <img className="wordmark" src={logoWordmark} alt="DevFridge" />
        <a href={PASTA_URL} target="_blank" rel="noreferrer">
          powered by $PASTA
        </a>
      </footer>
    </div>
  );
}
