import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  PROGRAM_BY_CLUSTER,
  PROGRAM_ID,
  isHttpEndpoint,
  looksLikeAlchemyKey,
  resolveRpcEndpoint,
  type ClusterName,
} from "./lib/constants";

type AppState = {
  cluster: ClusterName;
  setCluster: (c: ClusterName) => void;
  endpoint: string;
  customRpc: string;
  setCustomRpc: (v: string) => void;
  alchemyKey: string;
  setAlchemyKey: (v: string) => void;
  programId: PublicKey;
  programIdInput: string;
  setProgramIdInput: (v: string) => void;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<ClusterName>(() => {
    const saved = localStorage.getItem("fridge.cluster");
    return saved === "mainnet" || saved === "devnet" || saved === "testnet"
      ? saved
      : "mainnet";
  });
  const [customRpc, setCustomRpc] = useState(() => {
    const saved = localStorage.getItem("fridge.rpc") ?? "";
    if (saved && !isHttpEndpoint(saved)) {
      localStorage.removeItem("fridge.rpc");
      return "";
    }
    return saved;
  });
  const [alchemyKey, setAlchemyKey] = useState(
    () => localStorage.getItem("fridge.alchemy") ?? ""
  );
  const [programIdInput, setProgramIdInput] = useState(
    () => PROGRAM_BY_CLUSTER.mainnet
  );

  const endpoint = resolveRpcEndpoint(customRpc, cluster, alchemyKey);

  function persistCluster(next: ClusterName) {
    localStorage.setItem("fridge.cluster", next);
    setCluster(next);
  }

  function persistRpc(next: string) {
    const trimmed = next.trim();
    if (!trimmed) localStorage.removeItem("fridge.rpc");
    else if (isHttpEndpoint(next) || looksLikeAlchemyKey(next)) {
      localStorage.setItem("fridge.rpc", trimmed);
    }
    setCustomRpc(next);
  }

  function persistAlchemy(next: string) {
    const trimmed = next.trim();
    if (!trimmed) localStorage.removeItem("fridge.alchemy");
    else if (looksLikeAlchemyKey(next)) localStorage.setItem("fridge.alchemy", trimmed);
    setAlchemyKey(next);
  }
  const programId = useMemo(() => {
    try {
      return new PublicKey(PROGRAM_BY_CLUSTER[cluster]);
    } catch {
      try {
        return new PublicKey(programIdInput.trim());
      } catch {
        return PROGRAM_ID;
      }
    }
  }, [cluster, programIdInput]);

  return (
    <Ctx.Provider
      value={{
        cluster,
        setCluster: persistCluster,
        endpoint,
        customRpc,
        setCustomRpc: persistRpc,
        alchemyKey,
        setAlchemyKey: persistAlchemy,
        programId,
        programIdInput,
        setProgramIdInput,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AppState missing");
  return ctx;
}
