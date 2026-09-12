const MIN = 500_000;

function provider() {
  return window.solana || window.phantom?.solana || null;
}

export async function connectWallet() {
  const p = provider();
  if (!p) throw new Error("Install Phantom or another Solana wallet.");
  const res = await p.connect();
  const address = res?.publicKey?.toString?.() || p.publicKey?.toString?.();
  if (!address) throw new Error("Wallet did not return an address.");
  if (p.signMessage) {
    const nonce = crypto.getRandomValues(new Uint8Array(8));
    const msg = new TextEncoder().encode(
      `DevFridge World v2\nURI: ${location.origin}/world/game-v2/\nNonce: ${[...nonce].map((b) => b.toString(16).padStart(2, "0")).join("")}\nIssued At: ${new Date().toISOString()}`,
    );
    await p.signMessage(msg, "utf8");
  }
  return address;
}

function sdkForMint(mint, decimals) {
  const DevFridgeSDK = window.DevFridgeSDK;
  if (!DevFridgeSDK) throw new Error("DevFridge SDK missing.");
  const raw = MIN * 10 ** (decimals ?? 6);
  return new DevFridgeSDK({
    tokenMint: mint,
    scannerUrl: "https://scan.devfridge.cool",
    fridgeUrl: "https://devfridge.cool",
    plans: {
      play: { minLockDays: 1, renewalThresholdDays: 0, minLockAmount: raw },
    },
  });
}

export async function unlockedTiers(address, cast) {
  const unlocked = new Set();
  await Promise.all(
    cast.map(async (c) => {
      const mint = c.token?.mint;
      if (!mint) return;
      try {
        const status = await sdkForMint(mint, c.token.decimals).checkSubscription(address);
        if (status?.active && status?.plan) unlocked.add(c.tier);
      } catch {
        /* lock check failed for this mint */
      }
    }),
  );
  return unlocked;
}
