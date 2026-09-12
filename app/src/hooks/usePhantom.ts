import { useCallback, useMemo, useState } from "react";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  browserRpcUrl,
  isHttpEndpoint,
  resolveRpcEndpoint,
  type ClusterName,
} from "../lib/constants";

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  signTransaction?: (
    tx: Transaction | VersionedTransaction
  ) => Promise<Transaction | VersionedTransaction>;
  signAndSendTransaction: (
    tx: Transaction | VersionedTransaction
  ) => Promise<{ signature: string }>;
};

type SimulationResponse = {
  error?: { message?: string };
  result?: {
    value?: {
      err?: unknown;
      logs?: string[] | null;
    };
  };
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
}

async function simulateBeforeSigning(
  connection: Connection,
  tx: Transaction | VersionedTransaction
): Promise<void> {
  const wire =
    tx instanceof Transaction
      ? tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
      : tx.serialize();

  const response = await fetch(connection.rpcEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "devfridge-preflight",
      method: "simulateTransaction",
      params: [
        bytesToBase64(wire),
        {
          encoding: "base64",
          commitment: "confirmed",
          sigVerify: false,
          replaceRecentBlockhash: false,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Transaction simulation request failed (${response.status})`
    );
  }

  const body = (await response.json()) as SimulationResponse;

  if (body.error) {
    throw new Error(
      body.error.message || "Transaction simulation failed"
    );
  }

  const simulationError = body.result?.value?.err;

  if (simulationError) {
    const logs = body.result?.value?.logs
      ?.slice(-3)
      .join(" | ");

    throw new Error(
      `Transaction would fail on-chain: ${JSON.stringify(
        simulationError
      )}${logs ? ` (${logs})` : ""}`
    );
  }
}

function getProvider(): PhantomProvider | null {
  const w = window as Window & {
    phantom?: {
      solana?: PhantomProvider;
    };
    solana?: PhantomProvider;
  };

  if (w.phantom?.solana?.isPhantom) {
    return w.phantom.solana;
  }

  if (w.solana?.isPhantom) {
    return w.solana;
  }

  return null;
}

export function usePhantom(
  cluster: ClusterName,
  fallbackEndpoint?: string
) {
  const [publicKey, setPublicKey] =
    useState<PublicKey | null>(null);

  const [error, setError] = useState("");

  const connection = useMemo(() => {
    const fallback = isHttpEndpoint(fallbackEndpoint ?? "")
      ? (fallbackEndpoint as string).replace(/\/+$/, "")
      : resolveRpcEndpoint("", cluster);

    return new Connection(
      browserRpcUrl(cluster, fallback),
      "confirmed"
    );
  }, [cluster, fallbackEndpoint]);

  const connect = useCallback(async () => {
    setError("");

    const provider = getProvider();

    if (!provider) {
      setError("Apri Phantom in Chrome e ricarica.");
      return;
    }

    try {
      const result = await provider.connect();

      if (!result?.publicKey) {
        throw new Error(
          "Phantom did not return a public key"
        );
      }

      setPublicKey(
        new PublicKey(result.publicKey.toString())
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : String(err)
      );
    }
  }, []);

  const sendTransaction = useCallback(
    async (
      tx: Transaction | VersionedTransaction,
      extraSigners: Keypair[] = []
    ): Promise<string> => {
      const provider = getProvider();

      if (!provider || !publicKey) {
        throw new Error("Connect Phantom first");
      }

      const sendOptions = {
        skipPreflight: false,
        maxRetries: 8,
        preflightCommitment: "confirmed" as const,
      };

      if (tx instanceof Transaction) {
        tx.feePayer = publicKey;

        if (!tx.recentBlockhash) {
          const latest =
            await connection.getLatestBlockhash(
              "confirmed"
            );

          tx.recentBlockhash = latest.blockhash;
          tx.lastValidBlockHeight =
            latest.lastValidBlockHeight;
        }

        /*
         * The generated mint and any other local accounts
         * must sign before the transaction is sent to Phantom.
         */
        if (extraSigners.length > 0) {
          tx.partialSign(...extraSigners);
        }
      } else if (extraSigners.length > 0) {
        tx.sign(extraSigners);
      }

      /*
       * Simulate the complete transaction before opening
       * Phantom's approval window.
       */
      await simulateBeforeSigning(connection, tx);

      /*
       * Phantom signs the wallet signature. DevFridge then
       * broadcasts through the RPC for the selected cluster.
       */
      if (provider.signTransaction) {
        const signed =
          await provider.signTransaction(tx);

        if (!signed) {
          throw new Error(
            "Wallet did not return a signed transaction"
          );
        }

        return connection.sendRawTransaction(
          signed.serialize(),
          sendOptions
        );
      }

      /*
       * The fallback cannot be used when the transaction
       * requires locally generated signers, such as a new mint.
       */
      if (extraSigners.length > 0) {
        throw new Error(
          "This transaction requires a wallet that supports signTransaction"
        );
      }

      const result =
        await provider.signAndSendTransaction(tx);

      if (!result?.signature) {
        throw new Error(
          "Wallet did not return a transaction signature"
        );
      }

      return result.signature;
    },
    [connection, publicKey]
  );

  return {
    publicKey,
    connected: Boolean(publicKey),
    installed: Boolean(getProvider()),
    error,
    connect,
    sendTransaction,
    connection,
  };
}
