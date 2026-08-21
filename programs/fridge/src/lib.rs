use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
    system_instruction,
};
use anchor_lang::system_program;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, spl_token::ID as TOKEN_PROGRAM_ID, SyncNative},
    token_2022::{self, Burn, spl_token_2022::ID as TOKEN_2022_PROGRAM_ID},
    token_interface::{
        self, CloseAccount, Mint, TokenAccount, TokenInterface, TransferChecked,
    },
};

declare_id!("9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6");

pub const LOCK_SEED: &[u8] = b"lock";
pub const BURN_SEED: &[u8] = b"burn";
pub const BOOST_SEED: &[u8] = b"boost";
pub const BOOST_VAULT_SEED: &[u8] = b"boost_vault";
pub const PASTA_MINT: Pubkey = pubkey!("39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump");
pub const WSOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const JUPITER_V6: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
pub const REDEMPTION_FEE_BPS: u64 = 200;
pub const BOOST_TIER_LAMPORTS: [u64; 3] = [100_000_000, 180_000_000, 500_000_000];
pub const BOOST_TIER_SECS: [i64; 3] = [86_400, 172_800, 604_800];

#[program]
pub mod fridge {
    use super::*;

    pub fn create_lock<'info>(
        ctx: Context<'_, '_, 'info, 'info, CreateLock<'info>>,
        amount: u64,
        unlock_at: i64,
        lock_id: u64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        assert_valid_amount(amount)?;
        assert_valid_unlock(unlock_at, now)?;

        let depositor_ata = &ctx.accounts.depositor_ata;
        require_keys_eq!(
            depositor_ata.mint,
            ctx.accounts.mint.key(),
            FridgeError::InvalidTokenAccount
        );
        require_keys_eq!(
            depositor_ata.owner,
            ctx.accounts.depositor.key(),
            FridgeError::InvalidAuthority
        );
        require!(
            depositor_ata.amount >= amount,
            FridgeError::InsufficientBalance
        );

        require_keys_eq!(
            ctx.accounts.token_program.key(),
            TOKEN_2022_PROGRAM_ID,
            FridgeError::InvalidMint
        );

        let decimals = ctx.accounts.mint.decimals;
        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.depositor_ata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            )
            .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
            amount,
            decimals,
        )?;

        ctx.accounts.vault.reload()?;
        let locked = ctx.accounts.vault.amount;
        require!(locked > 0, FridgeError::InvalidAmount);

        let lock = &mut ctx.accounts.lock;
        lock.depositor = ctx.accounts.depositor.key();
        lock.mint = ctx.accounts.mint.key();
        lock.amount = locked;
        lock.created_at = now;
        lock.unlock_at = unlock_at;
        lock.bump = ctx.bumps.lock;
        lock.lock_id = lock_id;
        Ok(())
    }

    pub fn claim<'info>(
        ctx: Context<'_, '_, 'info, 'info, Claim<'info>>,
        swap_data: Vec<u8>,
        min_pasta_out: u64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let lock = &ctx.accounts.lock;

        require_keys_eq!(
            lock.depositor,
            ctx.accounts.depositor.key(),
            FridgeError::Unauthorized
        );
        require_keys_eq!(lock.mint, ctx.accounts.mint.key(), FridgeError::InvalidMint);
        require_gte!(now, lock.unlock_at, FridgeError::LockNotMatured);

        require_keys_eq!(
            ctx.accounts.token_program.key(),
            TOKEN_2022_PROGRAM_ID,
            FridgeError::InvalidMint
        );

        let lock_id_bytes = lock.lock_id.to_le_bytes();
        let bump = [lock.bump];
        let signer_seeds: &[&[u8]] = &[
            LOCK_SEED,
            lock.depositor.as_ref(),
            lock.mint.as_ref(),
            lock_id_bytes.as_ref(),
            bump.as_ref(),
        ];

        let vault_amount = ctx.accounts.vault.amount;
        let fee = redemption_fee(vault_amount)?;
        let remainder = vault_amount.checked_sub(fee).ok_or(error!(FridgeError::Overflow))?;
        let decimals = ctx.accounts.mint.decimals;
        let is_pasta = ctx.accounts.mint.key() == PASTA_MINT;

        if remainder > 0 {
            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.vault.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to: ctx.accounts.depositor_ata.to_account_info(),
                        authority: ctx.accounts.lock.to_account_info(),
                    },
                    &[signer_seeds],
                ),
                remainder,
                decimals,
            )?;
        }

        if fee > 0 {
            // Mainnet: $PASTA burns the fee; other mints Jupiter-buy $PASTA then burn.
            // test-cluster (devnet/testnet): no Jupiter / no $PASTA liquidity, so burn
            // 2% of the locked mint in place. Never enable test-cluster on mainnet.
            if is_pasta || cfg!(feature = "test-cluster") {
                let _ = (&swap_data, min_pasta_out);
                token_2022::burn(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Burn {
                            mint: ctx.accounts.mint.to_account_info(),
                            from: ctx.accounts.vault.to_account_info(),
                            authority: ctx.accounts.lock.to_account_info(),
                        },
                        &[signer_seeds],
                    ),
                    fee,
                )?;
            } else {
                buyback_and_burn_pasta(&ctx, fee, decimals, &swap_data, min_pasta_out)?;
            }
        }

        token_interface::close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.depositor.to_account_info(),
                authority: ctx.accounts.lock.to_account_info(),
            },
            &[signer_seeds],
        ))?;

        Ok(())
    }

    /// Pay SOL into the program vault and start the on-chain featured timer.
    /// $PASTA buy-and-burn is performed by `crank_buyback` from that vault.
    pub fn boost(ctx: Context<BoostFeature>, tier: u8) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let tier_idx = tier as usize;
        require!(tier_idx < BOOST_TIER_LAMPORTS.len(), FridgeError::InvalidBoostTier);
        let lamports = BOOST_TIER_LAMPORTS[tier_idx];
        let duration = BOOST_TIER_SECS[tier_idx];

        require!(ctx.accounts.lock.unlock_at > now, FridgeError::NeedLiveLock);
        require_keys_eq!(
            ctx.accounts.lock.mint,
            ctx.accounts.mint.key(),
            FridgeError::InvalidMint
        );

        if ctx.accounts.vault.lamports() == 0 {
            let vault_bump = [ctx.bumps.vault];
            let vault_seeds: &[&[u8]] = &[BOOST_VAULT_SEED, vault_bump.as_ref()];
            invoke_signed(
                &system_instruction::create_account(
                    ctx.accounts.payer.key,
                    ctx.accounts.vault.key,
                    lamports,
                    0,
                    &system_program::ID,
                ),
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.vault.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[vault_seeds],
            )?;
        } else {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.payer.to_account_info(),
                        to: ctx.accounts.vault.to_account_info(),
                    },
                ),
                lamports,
            )?;
        }

        let boost = &mut ctx.accounts.boost;
        let base = if boost.expires_at > now { boost.expires_at } else { now };
        boost.payer = ctx.accounts.payer.key();
        boost.mint = ctx.accounts.mint.key();
        boost.tier = tier;
        if boost.created_at == 0 {
            boost.created_at = now;
        }
        boost.expires_at = base
            .checked_add(duration)
            .ok_or(error!(FridgeError::Overflow))?;
        boost.bump = ctx.bumps.boost;
        Ok(())
    }

    /// Permissionless crank: wrap SOL from the boost vault, Jupiter-buy $PASTA, burn it.
    pub fn crank_buyback<'info>(
        ctx: Context<'_, '_, 'info, 'info, CrankBuyback<'info>>,
        amount: u64,
        swap_data: Vec<u8>,
        min_pasta_out: u64,
    ) -> Result<()> {
        require!(amount > 0, FridgeError::InvalidAmount);
        let rent_min = Rent::get()?.minimum_balance(0);
        require!(
            ctx.accounts
                .vault
                .lamports()
                .saturating_sub(rent_min)
                >= amount,
            FridgeError::InsufficientVault
        );
        require!(!swap_data.is_empty(), FridgeError::MissingSwapRoute);
        require!(ctx.remaining_accounts.len() >= 1, FridgeError::MissingSwapRoute);

        let vault_bump = [ctx.bumps.vault];
        let vault_seeds: &[&[u8]] = &[BOOST_VAULT_SEED, vault_bump.as_ref()];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.wsol_ata.to_account_info(),
                },
                &[vault_seeds],
            ),
            amount,
        )?;
        token::sync_native(CpiContext::new(
            ctx.accounts.wsol_token_program.to_account_info(),
            SyncNative {
                account: ctx.accounts.wsol_ata.to_account_info(),
            },
        ))?;

        let jupiter_program = &ctx.remaining_accounts[0];
        let jupiter_accounts = &ctx.remaining_accounts[1..];
        require_keys_eq!(
            *jupiter_program.key,
            JUPITER_V6,
            FridgeError::InvalidSwapProgram
        );

        let burn_bump = [ctx.bumps.burn_authority];
        let burn_seeds: &[&[u8]] = &[BURN_SEED, burn_bump.as_ref()];
        let burn_key = ctx.accounts.burn_authority.key();
        let metas: Vec<AccountMeta> = jupiter_accounts
            .iter()
            .map(|acc| {
                let is_signer = acc.key() == burn_key;
                if acc.is_writable {
                    AccountMeta::new(*acc.key, is_signer)
                } else {
                    AccountMeta::new_readonly(*acc.key, is_signer)
                }
            })
            .collect();
        let mut infos = Vec::with_capacity(jupiter_accounts.len() + 1);
        infos.push(jupiter_program.clone());
        infos.extend(jupiter_accounts.iter().cloned());
        invoke_signed(
            &Instruction {
                program_id: JUPITER_V6,
                accounts: metas,
                data: swap_data,
            },
            &infos,
            &[burn_seeds],
        )?;

        ctx.accounts.pasta_ata.reload()?;
        require!(
            ctx.accounts.pasta_ata.amount >= min_pasta_out && ctx.accounts.pasta_ata.amount > 0,
            FridgeError::BuybackFailed
        );
        require_keys_eq!(ctx.accounts.pasta_ata.mint, PASTA_MINT, FridgeError::InvalidMint);
        require_keys_eq!(
            ctx.accounts.pasta_ata.owner,
            ctx.accounts.burn_authority.key(),
            FridgeError::InvalidAuthority
        );
        token_2022::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.pasta_mint.to_account_info(),
                    from: ctx.accounts.pasta_ata.to_account_info(),
                    authority: ctx.accounts.burn_authority.to_account_info(),
                },
                &[burn_seeds],
            ),
            ctx.accounts.pasta_ata.amount,
        )?;
        Ok(())
    }
}

pub fn assert_valid_amount(amount: u64) -> Result<()> {
    require!(amount > 0, FridgeError::InvalidAmount);
    Ok(())
}

pub fn assert_valid_unlock(unlock_at: i64, now: i64) -> Result<()> {
    require!(unlock_at > now, FridgeError::InvalidUnlockTime);
    Ok(())
}

pub fn redemption_fee(amount: u64) -> Result<u64> {
    let fee = amount
        .checked_mul(REDEMPTION_FEE_BPS)
        .ok_or(error!(FridgeError::Overflow))?
        .checked_div(10_000)
        .ok_or(error!(FridgeError::Overflow))?;
    Ok(fee)
}

fn buyback_and_burn_pasta<'info>(
    ctx: &Context<'_, '_, 'info, 'info, Claim<'info>>,
    fee: u64,
    decimals: u8,
    swap_data: &[u8],
    min_pasta_out: u64,
) -> Result<()> {
    require!(!swap_data.is_empty(), FridgeError::MissingSwapRoute);
    require!(ctx.remaining_accounts.len() >= 4, FridgeError::MissingSwapRoute);

    let pasta_mint_info = &ctx.remaining_accounts[0];
    let fee_ata_info = &ctx.remaining_accounts[1];
    let pasta_ata_info = &ctx.remaining_accounts[2];
    let jupiter_program = &ctx.remaining_accounts[3];
    let jupiter_accounts = &ctx.remaining_accounts[4..];

    require_keys_eq!(*pasta_mint_info.key, PASTA_MINT, FridgeError::InvalidMint);
    require_keys_eq!(*jupiter_program.key, JUPITER_V6, FridgeError::InvalidSwapProgram);

    let lock = &ctx.accounts.lock;
    let lock_id_bytes = lock.lock_id.to_le_bytes();
    let lock_bump = [lock.bump];
    let lock_seeds: &[&[u8]] = &[
        LOCK_SEED,
        lock.depositor.as_ref(),
        lock.mint.as_ref(),
        lock_id_bytes.as_ref(),
        lock_bump.as_ref(),
    ];

    token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: fee_ata_info.clone(),
                authority: ctx.accounts.lock.to_account_info(),
            },
            &[lock_seeds],
        ),
        fee,
        decimals,
    )?;

    let burn_bump = [ctx.bumps.burn_authority];
    let burn_seeds: &[&[u8]] = &[BURN_SEED, burn_bump.as_ref()];
    let burn_key = ctx.accounts.burn_authority.key();

    let metas: Vec<AccountMeta> = jupiter_accounts
        .iter()
        .map(|acc| {
            let is_signer = acc.key() == burn_key;
            if acc.is_writable {
                AccountMeta::new(*acc.key, is_signer)
            } else {
                AccountMeta::new_readonly(*acc.key, is_signer)
            }
        })
        .collect();

    let mut infos = Vec::with_capacity(jupiter_accounts.len() + 1);
    infos.push(jupiter_program.clone());
    infos.extend(jupiter_accounts.iter().cloned());

    invoke_signed(
        &Instruction {
            program_id: JUPITER_V6,
            accounts: metas,
            data: swap_data.to_vec(),
        },
        &infos,
        &[burn_seeds],
    )?;

    let pasta_ata = InterfaceAccount::<TokenAccount>::try_from(pasta_ata_info)?;
    require!(
        pasta_ata.amount >= min_pasta_out && pasta_ata.amount > 0,
        FridgeError::BuybackFailed
    );
    require_keys_eq!(pasta_ata.mint, PASTA_MINT, FridgeError::InvalidMint);
    require_keys_eq!(
        pasta_ata.owner,
        ctx.accounts.burn_authority.key(),
        FridgeError::InvalidAuthority
    );

    token_2022::burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: pasta_mint_info.clone(),
                from: pasta_ata_info.clone(),
                authority: ctx.accounts.burn_authority.to_account_info(),
            },
            &[burn_seeds],
        ),
        pasta_ata.amount,
    )?;
    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, unlock_at: i64, lock_id: u64)]
pub struct CreateLock<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mint::token_program = token_program
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = depositor,
        associated_token::token_program = token_program
    )]
    pub depositor_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = depositor,
        space = 8 + Lock::INIT_SPACE,
        seeds = [
            LOCK_SEED,
            depositor.key().as_ref(),
            mint.key().as_ref(),
            &lock_id.to_le_bytes()
        ],
        bump
    )]
    pub lock: Account<'info, Lock>,

    #[account(
        init,
        payer = depositor,
        associated_token::mint = mint,
        associated_token::authority = lock,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = mint,
        associated_token::authority = depositor,
        associated_token::token_program = token_program
    )]
    pub depositor_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = depositor,
        has_one = depositor @ FridgeError::Unauthorized,
        has_one = mint @ FridgeError::InvalidMint,
        seeds = [
            LOCK_SEED,
            depositor.key().as_ref(),
            mint.key().as_ref(),
            &lock.lock_id.to_le_bytes()
        ],
        bump = lock.bump
    )]
    pub lock: Account<'info, Lock>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = lock,
        associated_token::token_program = token_program
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: burn PDA, used only as Token-2022 authority. It does not hold SOL.
    #[account(seeds = [BURN_SEED], bump)]
    pub burn_authority: UncheckedAccount<'info>,

    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BoostFeature<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Token being featured. Any mint with a live Fridge lock.
    /// CHECK: compared to lock.mint
    pub mint: UncheckedAccount<'info>,

    #[account(
        seeds = [
            LOCK_SEED,
            lock.depositor.as_ref(),
            lock.mint.as_ref(),
            &lock.lock_id.to_le_bytes()
        ],
        bump = lock.bump,
        constraint = lock.mint == mint.key() @ FridgeError::InvalidMint
    )]
    pub lock: Box<Account<'info, Lock>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + Boost::INIT_SPACE,
        seeds = [BOOST_SEED, mint.key().as_ref()],
        bump
    )]
    pub boost: Box<Account<'info, Boost>>,

    /// CHECK: SOL vault. Program later wraps this and burns $PASTA via crank_buyback.
    #[account(mut, seeds = [BOOST_VAULT_SEED], bump)]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CrankBuyback<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    /// CHECK: SOL collected from boost payments.
    #[account(mut, seeds = [BOOST_VAULT_SEED], bump)]
    pub vault: UncheckedAccount<'info>,

    #[account(address = WSOL_MINT)]
    pub wsol_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = cranker,
        associated_token::mint = wsol_mint,
        associated_token::authority = burn_authority,
        associated_token::token_program = wsol_token_program
    )]
    pub wsol_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut, address = PASTA_MINT)]
    pub pasta_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        init_if_needed,
        payer = cranker,
        associated_token::mint = pasta_mint,
        associated_token::authority = burn_authority,
        associated_token::token_program = token_program
    )]
    pub pasta_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Jupiter user + $PASTA burn authority.
    #[account(seeds = [BURN_SEED], bump)]
    pub burn_authority: UncheckedAccount<'info>,

    #[account(address = TOKEN_2022_PROGRAM_ID)]
    pub token_program: Interface<'info, TokenInterface>,
    #[account(address = TOKEN_PROGRAM_ID)]
    pub wsol_token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Lock {
    pub depositor: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub created_at: i64,
    pub unlock_at: i64,
    pub bump: u8,
    pub lock_id: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Boost {
    pub payer: Pubkey,
    pub mint: Pubkey,
    pub tier: u8,
    pub created_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum FridgeError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Unlock time must be in the future")]
    InvalidUnlockTime,
    #[msg("Mint must be a Token-2022 mint")]
    InvalidMint,
    #[msg("Token account mint or owner is invalid")]
    InvalidTokenAccount,
    #[msg("Signer is not the token account authority")]
    InvalidAuthority,
    #[msg("Only the original depositor can claim")]
    Unauthorized,
    #[msg("Lock has not reached unlock_at")]
    LockNotMatured,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Depositor ATA balance is below the lock amount")]
    InsufficientBalance,
    #[msg("A Jupiter route is required to buy and burn PASTA")]
    MissingSwapRoute,
    #[msg("Swap program must be Jupiter v6")]
    InvalidSwapProgram,
    #[msg("Buyback did not produce enough PASTA to burn")]
    BuybackFailed,
    #[msg("Boost tier must be 0=24h, 1=48h, or 2=7d")]
    InvalidBoostTier,
    #[msg("Boost requires a live Fridge lock that has not unlocked yet")]
    NeedLiveLock,
    #[msg("Boost vault does not hold enough SOL to buy back $PASTA")]
    InsufficientVault,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_zero_amount() {
        assert!(assert_valid_amount(0).is_err());
        assert!(assert_valid_amount(1).is_ok());
    }

    #[test]
    fn rejects_invalid_unlock() {
        assert!(assert_valid_unlock(100, 100).is_err());
        assert!(assert_valid_unlock(99, 100).is_err());
        assert!(assert_valid_unlock(101, 100).is_ok());
    }

    #[test]
    fn redemption_fee_is_two_percent() {
        assert_eq!(redemption_fee(100).unwrap(), 2);
        assert_eq!(redemption_fee(10_000).unwrap(), 200);
        assert_eq!(redemption_fee(49).unwrap(), 0);
        assert_eq!(redemption_fee(50).unwrap(), 1);
    }

    #[test]
    fn boost_tiers_match_scan_packages() {
        assert_eq!(BOOST_TIER_LAMPORTS[0], 100_000_000);
        assert_eq!(BOOST_TIER_LAMPORTS[1], 180_000_000);
        assert_eq!(BOOST_TIER_LAMPORTS[2], 500_000_000);
        assert_eq!(BOOST_TIER_SECS[0], 86_400);
        assert_eq!(BOOST_TIER_SECS[1], 172_800);
        assert_eq!(BOOST_TIER_SECS[2], 604_800);
    }

    #[test]
    fn boost_vault_seed() {
        assert_eq!(BOOST_VAULT_SEED, b"boost_vault");
    }
}
