# Community Security Review — Posting Templates

Post these in the channels listed below. Log any credible responses in this file with date and link.

---

## Target channels

1. **Solana Stack Exchange** — https://solana.stackexchange.com (tag: `security`, `anchor`)
2. **Solana Tech Discord** — https://discord.gg/solana (`#security` or `#anchor-development`)
3. **r/solana** — https://reddit.com/r/solana

---

## Post: Solana Stack Exchange https://solana.stackexchange.com/questions/24481/security-review-request-token-2022-time-lock-vault-anchor-0-30-750-loc

**Title:** Security review request: Token-2022 time-lock vault (Anchor 0.30, 750 LOC)

**Body:**

I've open-sourced a Token-2022 time-lock vault program and would appreciate community security review before recommending it for broader use.

**What it does:**
- Any wallet creates PDA-owned time-locked token vaults (Token-2022 only)
- Only the original depositor can claim after `unlock_at`
- 2% redemption fee buys and burns $PASTA via Jupiter CPI
- Separate `boost` instruction collects SOL; permissionless `crank_buyback` wraps + swaps + burns

**Repo:** https://github.com/mikeminer/devfridge
**Program:** `programs/fridge/src/lib.rs` (~750 lines)
**Program ID:** `9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6`
**Sealevel-attacks checklist:** See `SECURITY.md` in repo root

**Specific areas I'd appreciate scrutiny on:**
1. The `remaining_accounts` pattern for Jupiter CPI — does validating only the program ID (JUPITER_V6) suffice, or can a malicious route drain the vault?
2. `init_if_needed` on `depositor_ata` in the Claim context — any reinitialization concern given the ATA constraint?
3. The `crank_buyback` instruction is permissionless — can a cranker manipulate timing or slippage to extract value beyond MEV?
4. Transfer-fee mint handling: vault stores post-transfer balance. Any edge case where the stored amount diverges from actual claimable?

No formal audit has been done. This is disclosed in SECURITY.md. Any findings will be credited publicly.

---

## Post: Solana Tech Discord (#security or #anchor-development)

Hey all — requesting community eyes on a small Anchor 0.30 program (Token-2022 time-lock vaults, ~750 LOC).

Repo: https://github.com/mikeminer/devfridge
Security doc with sealevel-attacks checklist: `SECURITY.md` at repo root.

Program does: time-lock Token-2022 deposits into PDA vaults, 2% fee on claim that Jupiter-buys and burns $PASTA, plus a boost/feature system. Permissionless crank for buybacks.

Would especially appreciate review of:
- `remaining_accounts` pattern for Jupiter CPI (only program ID validated)
- Permissionless `crank_buyback` — any value extraction beyond standard MEV?
- Transfer-fee mint edge cases

No audit yet — this is disclosed. Offering bounties from future protocol fees for confirmed findings. Details in SECURITY.md.

---

## Post: r/solana

**Title:** [Open Source] Requesting security review — Token-2022 time-lock vault (Anchor, 750 LOC)

**Body:**

I'm building DevFridge, a Token-2022 time-lock vault on Solana. The program is open source and I'm explicitly requesting community review before pushing for broader adoption.

**What:** PDA-owned time-locked token vaults. Depositor-only claim after unlock. 2% fee buys and burns $PASTA via Jupiter. Permissionless crank for boost-funded buybacks.

**Code:** https://github.com/mikeminer/devfridge/blob/main/programs/fridge/src/lib.rs
**Security doc:** https://github.com/mikeminer/devfridge/blob/main/SECURITY.md

The SECURITY.md includes a sealevel-attacks checklist, known limitations, and a bug bounty offer (funded from future protocol fees — zero upfront, paid on confirmed findings).

CI runs `cargo clippy -D warnings`, `cargo audit`, unit tests, and Sec3 X-ray on every push.

I'm not claiming this is audited — I'm disclosing that it isn't and asking for help finding issues. Any credible finding gets public credit and a bounty once protocol revenue exists.

If you review Anchor programs or have experience with Token-2022 edge cases, I'd appreciate 30 minutes of your time looking at the Jupiter CPI pattern and the permissionless crank logic.

---

## Response log

| Date | Channel | Reviewer | Finding | Severity | Status |
|------|---------|----------|---------|----------|--------|
| _pending_ | — | — | — | — | — |
