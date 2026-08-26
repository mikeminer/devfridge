/**
 * Construct the plaintext message for admin actions.
 * Server verifies this message was signed by the admin wallet.
 */
export function buildAdminMessage(
  action: "add" | "remove" | "edit",
  wallet: string,
  extra?: { tier?: number; role?: string }
): string {
  const ts = Math.floor(Date.now() / 1000);
  const lines = [
    "DevFridge Team Admin",
    `Timestamp: ${ts}`,
    `Action: ${action}`,
    `Wallet: ${wallet}`,
  ];
  if (extra?.tier) lines.push(`Tier: ${extra.tier}`);
  if (extra?.role) lines.push(`Role: ${extra.role}`);
  return lines.join("\n");
}

/** Encode a Uint8Array to base58 (for sending signature to server). */
export function encodeBase58(bytes: Uint8Array): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    str += "1";
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += ALPHABET[digits[i]];
  }
  return str;
}
