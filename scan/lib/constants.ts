export const PROGRAM_ID =
  process.env.NEXT_PUBLIC_DEVFRIDGE_PROGRAM_ID ||
  "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6";

export const PASTA_MINT =
  process.env.NEXT_PUBLIC_PASTA_MINT ||
  "39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";

export const TREASURY =
  process.env.NEXT_PUBLIC_TREASURY_WALLET ||
  "GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W";

export const BURN_ADDRESS =
  process.env.NEXT_PUBLIC_BURN_ADDRESS ||
  "1nc1nerator11111111111111111111111111111111";

export const PUMPFUN_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const TOKEN_METADATA_PROGRAM = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

export const LOCK_ACCOUNT_SIZE = 105;
export const LOCK_DISC = Uint8Array.from([8, 255, 36, 202, 210, 22, 57, 137]);

export const BOOST_TIERS = {
  "24h": { label: "24h Boost", sol: 0.1, hours: 24, fire: "🔥" },
  "48h": { label: "48h Boost", sol: 0.18, hours: 48, fire: "🔥🔥" },
  "7d": { label: "7d Boost", sol: 0.5, hours: 168, fire: "🔥🔥🔥" },
} as const;

export type BoostTier = keyof typeof BOOST_TIERS;
