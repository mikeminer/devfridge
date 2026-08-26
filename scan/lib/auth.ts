import { PublicKey } from "@solana/web3.js";

const ADMIN_WALLET = "GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W";
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Verify that `message` was signed by the admin wallet using Ed25519.
 * Signature and signer are base58-encoded.
 */
export async function verifyAdminSignature(
  message: string,
  signatureB58: string,
  signer: string
): Promise<boolean> {
  if (signer !== ADMIN_WALLET) return false;

  // Check timestamp freshness
  const tsMatch = message.match(/Timestamp:\s*(\d+)/);
  if (!tsMatch) return false;
  const ts = parseInt(tsMatch[1], 10) * 1000;
  if (Math.abs(Date.now() - ts) > MAX_AGE_MS) return false;

  try {
    const nacl = await import("tweetnacl");
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = decodeBase58(signatureB58);
    const pubkeyBytes = new PublicKey(signer).toBytes();
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubkeyBytes);
  } catch {
    return false;
  }
}

function decodeBase58(str: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const BASE = 58;
  const bytes: number[] = [0];
  for (const char of str) {
    const idx = ALPHABET.indexOf(char);
    if (idx < 0) throw new Error("Invalid base58 character");
    let carry = idx;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * BASE;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of str) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}
