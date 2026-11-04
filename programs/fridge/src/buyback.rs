//! Jupiter buyback checks.
//!
//! `claim` and `crank_buyback` used to forward a caller-built Jupiter v6 route
//! signed by the burn PDA, then accept the swap if the burn PASTA account's
//! *absolute* balance was at least a caller-supplied minimum. That is bypassed
//! by pre-seeding one atom of PASTA and pointing the route at the caller.
//!
//! The checks here pin the route header to the escrow and the burn PASTA ATA,
//! refuse any other writable token account the burn PDA controls, and leave
//! balance *deltas* to the instruction (input fully spent, PASTA received).

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::AccountMeta;
use anchor_spl::token::spl_token::ID as TOKEN_PROGRAM_ID;
use anchor_spl::token_2022::spl_token_2022::ID as TOKEN_2022_PROGRAM_ID;

use super::{FridgeError, JUPITER_V6, PASTA_MINT};

const ROUTE: [u8; 8] = [229, 23, 203, 151, 122, 227, 173, 42];
const ROUTE_V2: [u8; 8] = [187, 100, 250, 204, 49, 196, 175, 20];
const SHARED_ACCOUNTS_ROUTE: [u8; 8] = [193, 32, 155, 51, 65, 214, 156, 129];
const SHARED_ACCOUNTS_ROUTE_V2: [u8; 8] = [209, 152, 83, 147, 124, 254, 216, 233];

pub struct RouteAccount {
    pub key: Pubkey,
    pub writable: bool,
    pub owner: Pubkey,
    pub data: Vec<u8>,
}

pub struct SwapExpectation {
    pub burn: Pubkey,
    pub source: Pubkey,
    pub source_mint: Pubkey,
    pub destination: Pubkey,
    pub input_amount: u64,
}

pub fn canonical_ata(owner: &Pubkey, mint: &Pubkey, token_program: &Pubkey) -> Pubkey {
    anchor_spl::associated_token::get_associated_token_address_with_program_id(
        owner,
        mint,
        token_program,
    )
}

pub fn jupiter_event_authority() -> Pubkey {
    Pubkey::find_program_address(&[b"__event_authority"], &JUPITER_V6).0
}

pub fn crank_pasta_floor(lamports: u64) -> Result<u64> {
    let scaled = lamports
        .checked_mul(super::MIN_PASTA_PER_LAMPORT)
        .ok_or(error!(FridgeError::Overflow))?;
    Ok(scaled.max(super::MIN_CRANK_PASTA_OUT))
}

pub fn assert_caller_min(caller_min: u64, floor: u64) -> Result<()> {
    require!(floor > 0, FridgeError::SlippageFloor);
    require!(caller_min >= floor, FridgeError::SlippageFloor);
    Ok(())
}

pub fn assert_crank_signer(signer: &Pubkey) -> Result<()> {
    require_keys_eq!(
        *signer,
        super::CRANK_AUTHORITY,
        FridgeError::UnauthorizedCrank
    );
    Ok(())
}

pub fn assert_crank_amount(amount: u64, spendable: u64) -> Result<()> {
    require!(amount > 0, FridgeError::InvalidAmount);
    require!(amount <= super::MAX_CRANK_LAMPORTS, FridgeError::CrankLimit);
    require!(spendable >= amount, FridgeError::InsufficientVault);
    Ok(())
}

/// `after` must equal `before + amount` (transfer fees and surprise credits fail closed).
pub fn assert_escrowed(before: u64, after: u64, amount: u64) -> Result<()> {
    let expected = before
        .checked_add(amount)
        .ok_or(error!(FridgeError::Overflow))?;
    require!(after == expected, FridgeError::BuybackFailed);
    Ok(())
}

/// Input must fall by exactly `input_amount` (donated residuals stay put).
/// PASTA received is the balance increase, not the absolute balance.
pub fn assert_swap_deltas(
    input_before: u64,
    input_after: u64,
    input_amount: u64,
    pasta_before: u64,
    pasta_after: u64,
    min_pasta_out: u64,
) -> Result<()> {
    let expected_input = input_before
        .checked_sub(input_amount)
        .ok_or(error!(FridgeError::Overflow))?;
    require!(input_after == expected_input, FridgeError::BuybackFailed);
    require!(pasta_after > pasta_before, FridgeError::BuybackFailed);
    let received = pasta_after
        .checked_sub(pasta_before)
        .ok_or(error!(FridgeError::Overflow))?;
    require!(received > 0, FridgeError::BuybackFailed);
    require!(received >= min_pasta_out, FridgeError::BuybackFailed);
    Ok(())
}

pub fn assert_not_drained(before: u64, after: u64) -> Result<()> {
    require!(after >= before, FridgeError::InvalidSwapDestination);
    Ok(())
}

pub fn token_amount(data: &[u8]) -> Result<u64> {
    let bytes = data
        .get(64..72)
        .ok_or(error!(FridgeError::InvalidTokenAccount))?;
    let mut buf = [0u8; 8];
    buf.copy_from_slice(bytes);
    Ok(u64::from_le_bytes(buf))
}

pub fn assert_token_custody(data: &[u8], mint: &Pubkey, owner: &Pubkey) -> Result<()> {
    let got_mint = read_pubkey(data, 0)?;
    let got_owner = read_pubkey(data, 32)?;
    require_keys_eq!(got_mint, *mint, FridgeError::InvalidMint);
    require_keys_eq!(got_owner, *owner, FridgeError::InvalidAuthority);
    Ok(())
}

pub fn route_accounts_from<'info>(accs: &[AccountInfo<'info>]) -> Result<Vec<RouteAccount>> {
    require!(!accs.is_empty(), FridgeError::MissingSwapRoute);
    let mut out = Vec::with_capacity(accs.len());
    for acc in accs {
        let data = if is_token_program(acc.owner) {
            let raw = acc
                .try_borrow_data()
                .map_err(|_| error!(FridgeError::InvalidTokenAccount))?;
            let n = raw.len().min(165);
            raw[..n].to_vec()
        } else {
            Vec::new()
        };
        out.push(RouteAccount {
            key: *acc.key,
            writable: acc.is_writable,
            owner: *acc.owner,
            data,
        });
    }
    Ok(out)
}

pub fn jupiter_metas<'info>(accounts: &[AccountInfo<'info>], burn: &Pubkey) -> Vec<AccountMeta> {
    accounts
        .iter()
        .map(|acc| {
            let is_signer = acc.key() == *burn;
            if acc.is_writable {
                AccountMeta::new(*acc.key, is_signer)
            } else {
                AccountMeta::new_readonly(*acc.key, is_signer)
            }
        })
        .collect()
}

pub fn validate_jupiter_route(
    data: &[u8],
    accounts: &[RouteAccount],
    expected: &SwapExpectation,
    forbid_writable: &[Pubkey],
) -> Result<()> {
    require!(data.len() >= 8, FridgeError::MissingSwapRoute);
    require!(
        expected.source != expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require!(
        expected.input_amount > 0,
        FridgeError::InvalidAmount
    );
    let mut disc = [0u8; 8];
    disc.copy_from_slice(&data[..8]);
    match disc {
        ROUTE => validate_route(accounts, expected)?,
        ROUTE_V2 => validate_route_v2(data, accounts, expected)?,
        SHARED_ACCOUNTS_ROUTE => validate_shared(accounts, expected)?,
        SHARED_ACCOUNTS_ROUTE_V2 => validate_shared_v2(data, accounts, expected)?,
        _ => return err!(FridgeError::InvalidSwapProgram),
    }
    scan_burn_controlled(accounts, expected, forbid_writable)?;
    require!(
        accounts
            .iter()
            .any(|acc| acc.key == expected.source && acc.writable),
        FridgeError::InvalidSwapDestination
    );
    require!(
        accounts
            .iter()
            .any(|acc| acc.key == expected.destination && acc.writable),
        FridgeError::InvalidSwapDestination
    );
    Ok(())
}

fn validate_route(accounts: &[RouteAccount], expected: &SwapExpectation) -> Result<()> {
    // Jupiter's current `route` keeps optional accounts in place and passes the
    // program id when destination_token_account / platform_fee_account are unset.
    require!(accounts.len() >= 9, FridgeError::InvalidSwapDestination);
    require!(
        is_token_program(&accounts[0].key),
        FridgeError::InvalidSwapProgram
    );
    require_keys_eq!(
        accounts[1].key,
        expected.burn,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[2].key,
        expected.source,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[3].key,
        expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require!(
        is_placeholder(&accounts[4].key) || accounts[4].key == expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(accounts[5].key, PASTA_MINT, FridgeError::InvalidMint);
    require!(
        is_placeholder(&accounts[6].key) || accounts[6].key == expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[7].key,
        jupiter_event_authority(),
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[8].key,
        JUPITER_V6,
        FridgeError::InvalidSwapProgram
    );
    Ok(())
}

fn validate_route_v2(
    data: &[u8],
    accounts: &[RouteAccount],
    expected: &SwapExpectation,
) -> Result<()> {
    require!(accounts.len() >= 9, FridgeError::InvalidSwapDestination);
    require_keys_eq!(
        accounts[0].key,
        expected.burn,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[1].key,
        expected.source,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[2].key,
        expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[3].key,
        expected.source_mint,
        FridgeError::InvalidMint
    );
    require_keys_eq!(accounts[4].key, PASTA_MINT, FridgeError::InvalidMint);
    require!(
        is_token_program(&accounts[5].key),
        FridgeError::InvalidSwapProgram
    );
    require_keys_eq!(
        accounts[6].key,
        TOKEN_2022_PROGRAM_ID,
        FridgeError::InvalidSwapProgram
    );
    let event = jupiter_event_authority();
    let mut idx = 7;
    if accounts[idx].key != event {
        require!(
            accounts[idx].key == expected.destination || is_placeholder(&accounts[idx].key),
            FridgeError::InvalidSwapDestination
        );
        idx += 1;
    }
    let event_acc = accounts
        .get(idx)
        .ok_or(error!(FridgeError::InvalidSwapDestination))?;
    require_keys_eq!(
        event_acc.key,
        event,
        FridgeError::InvalidSwapDestination
    );
    let program_acc = accounts
        .get(idx + 1)
        .ok_or(error!(FridgeError::InvalidSwapDestination))?;
    require_keys_eq!(
        program_acc.key,
        JUPITER_V6,
        FridgeError::InvalidSwapProgram
    );
    require_v2_amounts(data, 8, 26, expected.input_amount)?;
    Ok(())
}

fn validate_shared(accounts: &[RouteAccount], expected: &SwapExpectation) -> Result<()> {
    require!(accounts.len() >= 13, FridgeError::InvalidSwapDestination);
    require!(
        is_token_program(&accounts[0].key),
        FridgeError::InvalidSwapProgram
    );
    require!(
        accounts[1].key != expected.burn,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[2].key,
        expected.burn,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[3].key,
        expected.source,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[6].key,
        expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[7].key,
        expected.source_mint,
        FridgeError::InvalidMint
    );
    require_keys_eq!(accounts[8].key, PASTA_MINT, FridgeError::InvalidMint);
    require!(
        is_placeholder(&accounts[9].key) || accounts[9].key == expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require!(
        is_placeholder(&accounts[10].key) || is_token_program(&accounts[10].key),
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[11].key,
        jupiter_event_authority(),
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[12].key,
        JUPITER_V6,
        FridgeError::InvalidSwapProgram
    );
    Ok(())
}

fn validate_shared_v2(
    data: &[u8],
    accounts: &[RouteAccount],
    expected: &SwapExpectation,
) -> Result<()> {
    require!(accounts.len() >= 12, FridgeError::InvalidSwapDestination);
    require!(
        accounts[0].key != expected.burn,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[1].key,
        expected.burn,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[2].key,
        expected.source,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[5].key,
        expected.destination,
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[6].key,
        expected.source_mint,
        FridgeError::InvalidMint
    );
    require_keys_eq!(accounts[7].key, PASTA_MINT, FridgeError::InvalidMint);
    require!(
        is_token_program(&accounts[8].key),
        FridgeError::InvalidSwapProgram
    );
    require_keys_eq!(
        accounts[9].key,
        TOKEN_2022_PROGRAM_ID,
        FridgeError::InvalidSwapProgram
    );
    require_keys_eq!(
        accounts[10].key,
        jupiter_event_authority(),
        FridgeError::InvalidSwapDestination
    );
    require_keys_eq!(
        accounts[11].key,
        JUPITER_V6,
        FridgeError::InvalidSwapProgram
    );
    // id: u8, then the same leading amount fields as route_v2.
    require_v2_amounts(data, 9, 27, expected.input_amount)?;
    Ok(())
}

fn require_v2_amounts(data: &[u8], amount_at: usize, fee_at: usize, input_amount: u64) -> Result<()> {
    let in_amount = read_u64(data, amount_at)?;
    let platform_fee = read_u16(data, fee_at)?;
    let positive_slippage = read_u16(data, fee_at + 2)?;
    require!(in_amount == input_amount, FridgeError::BuybackFailed);
    require!(platform_fee == 0, FridgeError::InvalidSwapDestination);
    require!(positive_slippage == 0, FridgeError::InvalidSwapDestination);
    Ok(())
}

fn scan_burn_controlled(
    accounts: &[RouteAccount],
    expected: &SwapExpectation,
    forbid_writable: &[Pubkey],
) -> Result<()> {
    for acc in accounts {
        if acc.writable && forbid_writable.iter().any(|key| key == &acc.key) {
            return err!(FridgeError::InvalidSwapDestination);
        }
        if !acc.writable || !is_token_program(&acc.owner) {
            continue;
        }
        if acc.data.len() < 165 {
            return err!(FridgeError::InvalidSwapDestination);
        }
        let mint = read_pubkey(&acc.data, 0)?;
        let owner = read_pubkey(&acc.data, 32)?;
        let delegate = token_delegate(&acc.data)?;
        let controlled = owner == expected.burn || delegate == Some(expected.burn);
        if !controlled {
            continue;
        }
        let allowed = acc.key == expected.source || acc.key == expected.destination;
        require!(allowed, FridgeError::InvalidSwapDestination);
        if acc.key == expected.source {
            require_keys_eq!(mint, expected.source_mint, FridgeError::InvalidMint);
        }
        if acc.key == expected.destination {
            require_keys_eq!(mint, PASTA_MINT, FridgeError::InvalidMint);
        }
    }
    Ok(())
}

fn token_delegate(data: &[u8]) -> Result<Option<Pubkey>> {
    if data.len() < 108 {
        return Ok(None);
    }
    let tag = read_u32(data, 72)?;
    if tag == 0 {
        return Ok(None);
    }
    require!(tag == 1, FridgeError::InvalidTokenAccount);
    Ok(Some(read_pubkey(data, 76)?))
}

fn is_token_program(key: &Pubkey) -> bool {
    key == &TOKEN_PROGRAM_ID || key == &TOKEN_2022_PROGRAM_ID
}

fn is_placeholder(key: &Pubkey) -> bool {
    key == &JUPITER_V6
}

fn read_pubkey(data: &[u8], offset: usize) -> Result<Pubkey> {
    let bytes = data
        .get(offset..offset + 32)
        .ok_or(error!(FridgeError::InvalidTokenAccount))?;
    Pubkey::try_from(bytes).map_err(|_| error!(FridgeError::InvalidTokenAccount))
}

fn read_u64(data: &[u8], offset: usize) -> Result<u64> {
    let bytes = data
        .get(offset..offset + 8)
        .ok_or(error!(FridgeError::MissingSwapRoute))?;
    let mut buf = [0u8; 8];
    buf.copy_from_slice(bytes);
    Ok(u64::from_le_bytes(buf))
}

fn read_u32(data: &[u8], offset: usize) -> Result<u32> {
    let bytes = data
        .get(offset..offset + 4)
        .ok_or(error!(FridgeError::InvalidTokenAccount))?;
    let mut buf = [0u8; 4];
    buf.copy_from_slice(bytes);
    Ok(u32::from_le_bytes(buf))
}

fn read_u16(data: &[u8], offset: usize) -> Result<u16> {
    let bytes = data
        .get(offset..offset + 2)
        .ok_or(error!(FridgeError::MissingSwapRoute))?;
    let mut buf = [0u8; 2];
    buf.copy_from_slice(bytes);
    Ok(u16::from_le_bytes(buf))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn token_data(mint: Pubkey, owner: Pubkey, delegate: Option<Pubkey>) -> Vec<u8> {
        let mut data = vec![0u8; 165];
        data[..32].copy_from_slice(mint.as_ref());
        data[32..64].copy_from_slice(owner.as_ref());
        if let Some(delegate) = delegate {
            data[72..76].copy_from_slice(&1u32.to_le_bytes());
            data[76..108].copy_from_slice(delegate.as_ref());
        }
        data
    }

    fn acc(key: Pubkey, writable: bool, owner: Pubkey, data: Vec<u8>) -> RouteAccount {
        RouteAccount {
            key,
            writable,
            owner,
            data,
        }
    }

    fn wsol_mint() -> Pubkey {
        pubkey!("So11111111111111111111111111111111111111112")
    }

    fn expectation(burn: Pubkey, source: Pubkey, destination: Pubkey) -> SwapExpectation {
        SwapExpectation {
            burn,
            source,
            source_mint: wsol_mint(),
            destination,
            input_amount: 100_000_000,
        }
    }

    fn live_header(burn: Pubkey, source: Pubkey, destination: Pubkey) -> Vec<RouteAccount> {
        let event = jupiter_event_authority();
        let pool = Pubkey::new_unique();
        vec![
            acc(TOKEN_2022_PROGRAM_ID, false, Pubkey::default(), vec![]),
            acc(burn, false, anchor_lang::system_program::ID, vec![]),
            acc(
                source,
                true,
                TOKEN_PROGRAM_ID,
                token_data(wsol_mint(), burn, None),
            ),
            acc(
                destination,
                true,
                TOKEN_2022_PROGRAM_ID,
                token_data(PASTA_MINT, burn, None),
            ),
            acc(JUPITER_V6, false, Pubkey::default(), vec![]),
            acc(PASTA_MINT, false, TOKEN_2022_PROGRAM_ID, vec![0; 82]),
            acc(JUPITER_V6, false, Pubkey::default(), vec![]),
            acc(event, false, Pubkey::default(), vec![]),
            acc(JUPITER_V6, false, Pubkey::default(), vec![]),
            // PumpSwap marks the burn PDA writable inside the route. That is
            // allowed here; the instruction rejects a lamport decrease.
            acc(burn, true, anchor_lang::system_program::ID, vec![]),
            acc(
                pool,
                true,
                TOKEN_PROGRAM_ID,
                token_data(wsol_mint(), Pubkey::new_unique(), None),
            ),
        ]
    }

    #[test]
    fn event_authority_is_the_jupiter_pda() {
        assert_eq!(
            jupiter_event_authority(),
            pubkey!("D8cy77BBepLMngZx6ZukaTff5hCt1HrWyKk3Hnd9oitf")
        );
    }

    #[test]
    fn accepts_live_route_shape_into_burn_pasta_ata() {
        let burn = pubkey!("6PQhfXQNnqrau7EKjFxrH6xwX3uv97RMsx62LmKBmT9m");
        let source = canonical_ata(&burn, &wsol_mint(), &TOKEN_PROGRAM_ID);
        let destination = canonical_ata(&burn, &PASTA_MINT, &TOKEN_2022_PROGRAM_ID);
        let accounts = live_header(burn, source, destination);
        let expected = expectation(burn, source, destination);
        assert!(validate_jupiter_route(&ROUTE, &accounts, &expected, &[]).is_ok());
    }

    #[test]
    fn rejects_fee_routed_to_attacker_destination() {
        let burn = Pubkey::new_unique();
        let source = canonical_ata(&burn, &wsol_mint(), &TOKEN_PROGRAM_ID);
        let destination = canonical_ata(&burn, &PASTA_MINT, &TOKEN_2022_PROGRAM_ID);
        let attacker = Pubkey::new_unique();
        let mut accounts = live_header(burn, source, destination);
        accounts[3] = acc(
            attacker,
            true,
            TOKEN_2022_PROGRAM_ID,
            token_data(PASTA_MINT, attacker, None),
        );
        assert!(validate_jupiter_route(
            &ROUTE,
            &accounts,
            &expectation(burn, source, destination),
            &[]
        )
        .is_err());
    }

    #[test]
    fn rejects_optional_destination_and_platform_fee_to_attacker() {
        let burn = Pubkey::new_unique();
        let source = canonical_ata(&burn, &wsol_mint(), &TOKEN_PROGRAM_ID);
        let destination = canonical_ata(&burn, &PASTA_MINT, &TOKEN_2022_PROGRAM_ID);
        let attacker = Pubkey::new_unique();
        let mut accounts = live_header(burn, source, destination);
        accounts[4] = acc(
            attacker,
            true,
            TOKEN_2022_PROGRAM_ID,
            token_data(PASTA_MINT, attacker, None),
        );
        assert!(validate_jupiter_route(
            &ROUTE,
            &accounts,
            &expectation(burn, source, destination),
            &[]
        )
        .is_err());

        let mut accounts = live_header(burn, source, destination);
        accounts[6] = acc(
            attacker,
            true,
            TOKEN_PROGRAM_ID,
            token_data(wsol_mint(), attacker, None),
        );
        assert!(validate_jupiter_route(
            &ROUTE,
            &accounts,
            &expectation(burn, source, destination),
            &[]
        )
        .is_err());
    }

    #[test]
    fn rejects_extra_burn_owned_token_account_and_vault() {
        let burn = Pubkey::new_unique();
        let source = canonical_ata(&burn, &wsol_mint(), &TOKEN_PROGRAM_ID);
        let destination = canonical_ata(&burn, &PASTA_MINT, &TOKEN_2022_PROGRAM_ID);
        let mut accounts = live_header(burn, source, destination);
        let residual = Pubkey::new_unique();
        accounts.push(acc(
            residual,
            true,
            TOKEN_2022_PROGRAM_ID,
            token_data(Pubkey::new_unique(), burn, None),
        ));
        assert!(validate_jupiter_route(
            &ROUTE,
            &accounts,
            &expectation(burn, source, destination),
            &[]
        )
        .is_err());

        let mut delegated = live_header(burn, source, destination);
        let delegated_ata = Pubkey::new_unique();
        delegated.push(acc(
            delegated_ata,
            true,
            TOKEN_PROGRAM_ID,
            token_data(wsol_mint(), Pubkey::new_unique(), Some(burn)),
        ));
        assert!(validate_jupiter_route(
            &ROUTE,
            &delegated,
            &expectation(burn, source, destination),
            &[]
        )
        .is_err());

        let vault = Pubkey::new_unique();
        let mut with_vault = live_header(burn, source, destination);
        with_vault.push(acc(vault, true, anchor_lang::system_program::ID, vec![]));
        assert!(validate_jupiter_route(
            &ROUTE,
            &with_vault,
            &expectation(burn, source, destination),
            &[vault]
        )
        .is_err());
    }

    #[test]
    fn rejects_unknown_jupiter_discriminator() {
        let burn = Pubkey::new_unique();
        let source = canonical_ata(&burn, &wsol_mint(), &TOKEN_PROGRAM_ID);
        let destination = canonical_ata(&burn, &PASTA_MINT, &TOKEN_2022_PROGRAM_ID);
        let accounts = live_header(burn, source, destination);
        let exact_out = [208u8, 51, 239, 151, 123, 43, 237, 92];
        assert!(validate_jupiter_route(
            &exact_out,
            &accounts,
            &expectation(burn, source, destination),
            &[]
        )
        .is_err());
    }

    #[test]
    fn dust_balance_is_not_a_successful_buyback() {
        // Pre-seeded 5 atoms, no new PASTA. The old check (`balance >= min && balance > 0`)
        // passed when the caller set min to 1.
        assert!(assert_swap_deltas(100, 0, 100, 5, 5, 1).is_err());
        assert!(assert_swap_deltas(100, 0, 100, 5, 6, 1_000_000).is_err());
        assert!(assert_swap_deltas(100, 0, 100, 5, 1_000_005, 1_000_000).is_ok());
        // Donated input must not be swept, and the escrow must be fully spent.
        assert!(assert_swap_deltas(150, 50, 100, 0, 1_000_000, 1_000_000).is_ok());
        assert!(assert_swap_deltas(150, 0, 100, 0, 1_000_000, 1_000_000).is_err());
        assert!(assert_swap_deltas(100, 1, 100, 0, 1_000_000, 1_000_000).is_err());
        assert!(assert_caller_min(1, 1_000_000).is_err());
        assert!(assert_caller_min(1_000_000, 1_000_000).is_ok());
    }

    #[test]
    fn crank_authority_cap_and_floor_reject_a_vault_drain() {
        let attacker = Pubkey::new_unique();
        assert!(assert_crank_signer(&attacker).is_err());
        assert!(assert_crank_signer(&super::super::CRANK_AUTHORITY).is_ok());
        assert!(assert_crank_amount(500_000_001, 1_000_000_000).is_err());
        assert!(assert_crank_amount(500_000_000, 500_000_000).is_ok());
        assert!(assert_crank_amount(500_000_000, 499_999_999).is_err());
        assert_eq!(crank_pasta_floor(100_000_000).unwrap(), 100_000_000);
        assert!(assert_not_drained(5_000_000, 4_999_999).is_err());
        assert!(assert_not_drained(5_000_000, 5_000_000).is_ok());
    }

    #[test]
    fn shared_v2_pins_destination_and_input_amount() {
        let burn = Pubkey::new_unique();
        let source = canonical_ata(&burn, &wsol_mint(), &TOKEN_PROGRAM_ID);
        let destination = canonical_ata(&burn, &PASTA_MINT, &TOKEN_2022_PROGRAM_ID);
        let program_authority = Pubkey::new_unique();
        let program_source = Pubkey::new_unique();
        let program_dest = Pubkey::new_unique();
        let accounts = vec![
            acc(program_authority, false, Pubkey::default(), vec![]),
            acc(burn, false, anchor_lang::system_program::ID, vec![]),
            acc(
                source,
                true,
                TOKEN_PROGRAM_ID,
                token_data(wsol_mint(), burn, None),
            ),
            acc(
                program_source,
                true,
                TOKEN_PROGRAM_ID,
                token_data(wsol_mint(), program_authority, None),
            ),
            acc(
                program_dest,
                true,
                TOKEN_2022_PROGRAM_ID,
                token_data(PASTA_MINT, program_authority, None),
            ),
            acc(
                destination,
                true,
                TOKEN_2022_PROGRAM_ID,
                token_data(PASTA_MINT, burn, None),
            ),
            acc(wsol_mint(), false, TOKEN_PROGRAM_ID, vec![]),
            acc(PASTA_MINT, false, TOKEN_2022_PROGRAM_ID, vec![]),
            acc(TOKEN_PROGRAM_ID, false, Pubkey::default(), vec![]),
            acc(TOKEN_2022_PROGRAM_ID, false, Pubkey::default(), vec![]),
            acc(jupiter_event_authority(), false, Pubkey::default(), vec![]),
            acc(JUPITER_V6, false, Pubkey::default(), vec![]),
        ];
        let mut data = vec![0u8; 40];
        data[..8].copy_from_slice(&SHARED_ACCOUNTS_ROUTE_V2);
        data[8] = 1; // id
        data[9..17].copy_from_slice(&100_000_000u64.to_le_bytes());
        let expected = expectation(burn, source, destination);
        assert!(validate_jupiter_route(&data, &accounts, &expected, &[]).is_ok());

        let mut bad_amount = data.clone();
        bad_amount[9..17].copy_from_slice(&1u64.to_le_bytes());
        assert!(validate_jupiter_route(&bad_amount, &accounts, &expected, &[]).is_err());

        let mut skim = data.clone();
        skim[27] = 1; // platform_fee_bps
        assert!(validate_jupiter_route(&skim, &accounts, &expected, &[]).is_err());
    }
}
