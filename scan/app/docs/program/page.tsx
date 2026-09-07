import type { Metadata } from "next";
import DocsShell from "@/components/DocsShell";
import { docMeta } from "@/lib/docs";
import { BURN_SEED, PASTA_MINT, PROGRAM_ID, TREASURY } from "@/lib/constants";
import { PublicKey } from "@solana/web3.js";

export const metadata: Metadata = docMeta("program");
const [burnAuthority] = PublicKey.findProgramAddressSync(
  [Buffer.from(BURN_SEED)], new PublicKey(PROGRAM_ID)
);

export default function ProgramDoc() {
  return (
    <DocsShell kicker="ON-CHAIN" title="Program IDs and fees">
      <p><strong>Not affiliated with any other token using the PASTA ticker.</strong></p>
      <p>
        The Solana mint above identifies the $PASTA tied to DevFridge. Match the full address
        before using a swap link; token names, tickers, and logos can be reused.
      </p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Fridge program</td>
            <td>
              <a href={`https://solscan.io/account/${PROGRAM_ID}`}>
                <code>{PROGRAM_ID}</code>
              </a>
            </td>
          </tr>
          <tr>
            <td>$PASTA mint</td>
            <td>
              <a href={`https://solscan.io/token/${PASTA_MINT}`}>
                <code>{PASTA_MINT}</code>
              </a>
            </td>
          </tr>
          <tr>
            <td>Treasury / dev</td>
            <td>
              <a href={`https://solscan.io/account/${TREASURY}`}>
                <code>{TREASURY}</code>
              </a>
            </td>
          </tr>
          <tr>
            <td>Claim fee</td>
            <td>2% buyback-and-burn $PASTA</td>
          </tr>
          <tr>
            <td>Feature</td>
            <td>0.1 SOL / 24h · 0.18 SOL / 48h · 0.5 SOL / 7d, plus network fees → $PASTA burn</td>
          </tr>
        </tbody>
      </table>
      <h2>Verify the buyback burn identity</h2>
      <p>
        Burn authority PDA: <a href={`https://solscan.io/account/${burnAuthority.toBase58()}`}>
          <code className="break-all">{burnAuthority.toBase58()}</code>
        </a>. Derive it from the UTF-8 seed <code>burn</code> and the Fridge program ID above.
        This authority is distinct from a user&apos;s lock PDA and the incinerator address.
      </p>
      <p>
        In the published <a href="https://github.com/mikeminer/devfridge/blob/master/programs/fridge/src/lib.rs">
          program source
        </a>, <code>PASTA_MINT</code> is fixed to <code className="break-all">{PASTA_MINT}</code>.
        Both <code>crank_buyback</code> and <code>buyback_and_burn_pasta</code> check this mint
        and the token account&apos;s burn authority before invoking Token-2022 Burn.
      </p>
      <p>
        To verify an actual burn, inspect a successful transaction from this program: its
        inner Token-2022 Burn instruction must name that mint and the derived authority.
        The PDA alone does not prove which mint was burned. Source checks describe this version;
        verify the deployed program and its upgrade authority before assuming future behavior.
      </p>
      <p>
        <a href="https://solscan.io/tx/8ed3v9zmo2G9hZwVrQrUmpaiXFFcoopr18X4XVu9cmYRttYW2eEmCn6W4iKAoB7r5fCbw3U6sUMZtTAgTW8rBnv">
          Example verified mainnet burn
        </a>: slot <code>441452166</code>, successful transaction, with an inner Token-2022 Burn
        naming this mint and burn authority. It burned <code>801223464986</code> base units
        (801,223.464986 PASTA at 6 decimals).
      </p>
      <p>
        Source: <a href="https://github.com/mikeminer/devfridge">github.com/mikeminer/devfridge</a>.
        Official socials and the bot:{" "}
        <a href="https://connect.devfridge.cool">connect.devfridge.cool</a>.
      </p>
    </DocsShell>
  );
}
