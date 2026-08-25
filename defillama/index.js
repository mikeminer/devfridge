const { getProvider } = require("../helper/solana");
const { PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey(
  "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6"
);
const LOCK_DATA_SIZE = 105; // 8 disc + 32 depositor + 32 mint + 8 amount + 8 created_at + 8 unlock_at + 1 bump + 8 lock_id
const LOCK_DISCRIMINATOR = Buffer.from([8, 255, 36, 202, 210, 22, 57, 137]);

function decodeLock(data) {
  const disc = data.slice(0, 8);
  if (!disc.equals(LOCK_DISCRIMINATOR)) return null;
  const mint = new PublicKey(data.slice(40, 72));
  const amount = data.readBigUInt64LE(72);
  const unlockAt = Number(data.readBigInt64LE(88));
  return { mint: mint.toBase58(), amount, unlockAt };
}

async function tvl(api) {
  const connection = getProvider("solana");
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { dataSize: LOCK_DATA_SIZE },
      { memcmp: { offset: 0, bytes: LOCK_DISCRIMINATOR.toString("base64"), encoding: "base64" } },
    ],
  });

  const now = Math.floor(Date.now() / 1000);

  for (const { account } of accounts) {
    const lock = decodeLock(account.data);
    if (!lock) continue;
    if (lock.unlockAt <= now) continue; // skip expired locks
    api.add(lock.mint, lock.amount);
  }
}

module.exports = {
  timetravel: false,
  methodology:
    "TVL is the sum of all Token-2022 tokens held in active Fridge time-lock vaults (locks whose unlock_at is still in the future).",
  solana: { tvl },
};
