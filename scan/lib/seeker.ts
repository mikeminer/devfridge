"use client";

/** Wallet Standard name registered by `@solana-mobile/seeker-connect-wallet-standard`. */
export const SEEKER_CONNECT_WALLET_NAME = "Seeker Connect";

/** Solana Mobile's public Nostr relay. Free for production use under their relay terms. */
export const SEEKER_RELAY_DOMAIN = "relay.solanamobile.com";

let registerStarted = false;

/** Registers Seeker Connect once, in the browser, after the wallet registry is listening. */
export function registerScannerSeeker(): void {
  if (registerStarted || typeof window === "undefined") return;
  registerStarted = true;
  void import("@solana-mobile/seeker-connect-wallet-standard")
    .then(({ registerSeekerConnect }) => {
      registerSeekerConnect({
        identity: {
          name: "DevFridge Scanner",
          uri: window.location.origin,
          icon: "brand/logo-mark.jpg",
        },
        relayDomain: SEEKER_RELAY_DOMAIN,
        chain: "solana:mainnet",
      });
    })
    .catch((err: unknown) => {
      registerStarted = false;
      console.error("Seeker Connect did not register", err);
    });
}
