#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, TransferChecked};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub const PAYMASTER_BPS: u64 = 1_500;
pub const BPS_DENOMINATOR: u64 = 10_000;

#[program]
pub mod shadow_paymaster {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>, agent: Pubkey) -> Result<()> {
        require!(agent != Pubkey::default(), ShadowError::InvalidAgent);
        validate_settlement_destinations(
            ctx.accounts.profit_vault.key(),
            ctx.accounts.paymaster_destination.key(),
            ctx.accounts.treasury_destination.key(),
        )?;

        let config = &mut ctx.accounts.config;
        config.governance = ctx.accounts.governance.key();
        config.agent = agent;
        config.profit_mint = ctx.accounts.profit_mint.key();
        config.profit_vault = ctx.accounts.profit_vault.key();
        config.paymaster_destination = ctx.accounts.paymaster_destination.key();
        config.treasury_destination = ctx.accounts.treasury_destination.key();
        config.vault_authority_bump = ctx.bumps.vault_authority;
        config.paused = true;
        Ok(())
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        ctx.accounts.config.paused = paused;
        emit!(PauseStateChanged {
            config: ctx.accounts.config.key(),
            paused,
            governance: ctx.accounts.governance.key(),
        });
        Ok(())
    }

    pub fn prepare_settlement(
        ctx: Context<PrepareSettlement>,
        args: PrepareSettlementArgs,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ShadowError::ProtocolPaused);
        require_settlement_liveness(args.expiry_slot)?;
        require!(
            args.minimum_net_profit > 0,
            ShadowError::InvalidMinimumProfit
        );
        require!(
            ctx.accounts.profit_vault.amount == args.pre_vault_balance,
            ShadowError::PreBalanceMismatch
        );

        let settlement = &mut ctx.accounts.settlement;
        settlement.config = ctx.accounts.config.key();
        settlement.agent = ctx.accounts.agent.key();
        settlement.nonce = args.nonce;
        settlement.manifest_hash = args.manifest_hash;
        settlement.expiry_slot = args.expiry_slot;
        settlement.pre_vault_balance = args.pre_vault_balance;
        settlement.committed_obligations = args.committed_obligations;
        settlement.minimum_net_profit = args.minimum_net_profit;
        settlement.eligible_profit = 0;
        settlement.paymaster_share = 0;
        settlement.treasury_share = 0;
        settlement.state = SettlementState::Prepared;
        settlement.bump = ctx.bumps.settlement;

        emit!(SettlementPrepared {
            settlement: settlement.key(),
            manifest_hash: settlement.manifest_hash,
            nonce: settlement.nonce,
            expiry_slot: settlement.expiry_slot,
            pre_vault_balance: settlement.pre_vault_balance,
            committed_obligations: settlement.committed_obligations,
        });
        Ok(())
    }

    pub fn finalize_settlement(ctx: Context<FinalizeSettlement>) -> Result<()> {
        require_settlement_liveness(ctx.accounts.settlement.expiry_slot)?;
        validate_configured_profit_vault(
            ctx.accounts.profit_vault.key(),
            ctx.accounts.config.profit_vault,
        )?;
        let settlement = &mut ctx.accounts.settlement;
        require!(!ctx.accounts.config.paused, ShadowError::ProtocolPaused);
        require!(
            settlement.state == SettlementState::Prepared,
            ShadowError::InvalidStateTransition
        );

        let (eligible_profit, paymaster_share, treasury_share) = calculate_profit_split(
            ctx.accounts.profit_vault.amount,
            settlement.pre_vault_balance,
            settlement.committed_obligations,
            settlement.minimum_net_profit,
        )?;

        settlement.eligible_profit = eligible_profit;
        settlement.paymaster_share = paymaster_share;
        settlement.treasury_share = treasury_share;
        settlement.state = SettlementState::Finalized;

        emit!(SettlementFinalized {
            settlement: settlement.key(),
            manifest_hash: settlement.manifest_hash,
            eligible_profit,
            paymaster_share,
            treasury_share,
        });
        Ok(())
    }

    pub fn distribute_paymaster(ctx: Context<DistributePaymaster>) -> Result<()> {
        let settlement = &mut ctx.accounts.settlement;
        require!(!ctx.accounts.config.paused, ShadowError::ProtocolPaused);
        require_settlement_liveness(settlement.expiry_slot)?;
        require!(
            settlement.state == SettlementState::Finalized,
            ShadowError::InvalidStateTransition
        );

        transfer_from_vault(
            VaultTransferAccounts {
                token_program: &ctx.accounts.token_program,
                profit_vault: &ctx.accounts.profit_vault,
                profit_mint: &ctx.accounts.profit_mint,
                destination: &ctx.accounts.paymaster_destination,
                vault_authority: &ctx.accounts.vault_authority,
            },
            ctx.accounts.config.key(),
            ctx.accounts.config.vault_authority_bump,
            settlement.paymaster_share,
        )?;

        settlement.state = SettlementState::Distributed;
        emit!(PaymasterDistributed {
            settlement: settlement.key(),
            destination: ctx.accounts.paymaster_destination.key(),
            amount: settlement.paymaster_share,
        });
        Ok(())
    }

    pub fn settle_treasury(ctx: Context<SettleTreasury>) -> Result<()> {
        let settlement = &mut ctx.accounts.settlement;
        require!(!ctx.accounts.config.paused, ShadowError::ProtocolPaused);
        require_settlement_liveness(settlement.expiry_slot)?;
        require!(
            settlement.state == SettlementState::Distributed,
            ShadowError::InvalidStateTransition
        );

        transfer_from_vault(
            VaultTransferAccounts {
                token_program: &ctx.accounts.token_program,
                profit_vault: &ctx.accounts.profit_vault,
                profit_mint: &ctx.accounts.profit_mint,
                destination: &ctx.accounts.treasury_destination,
                vault_authority: &ctx.accounts.vault_authority,
            },
            ctx.accounts.config.key(),
            ctx.accounts.config.vault_authority_bump,
            settlement.treasury_share,
        )?;

        settlement.state = SettlementState::Complete;
        emit!(TreasurySettled {
            settlement: settlement.key(),
            destination: ctx.accounts.treasury_destination.key(),
            amount: settlement.treasury_share,
        });
        Ok(())
    }
}

fn validate_configured_profit_vault(actual_vault: Pubkey, configured_vault: Pubkey) -> Result<()> {
    require_keys_eq!(actual_vault, configured_vault, ShadowError::UnexpectedVault);
    Ok(())
}

fn validate_settlement_destinations(
    profit_vault: Pubkey,
    paymaster_destination: Pubkey,
    treasury_destination: Pubkey,
) -> Result<()> {
    require_keys_neq!(
        paymaster_destination,
        treasury_destination,
        ShadowError::DuplicateDestinations
    );
    require_keys_neq!(
        profit_vault,
        paymaster_destination,
        ShadowError::VaultDestinationAlias
    );
    require_keys_neq!(
        profit_vault,
        treasury_destination,
        ShadowError::VaultDestinationAlias
    );
    Ok(())
}

fn validate_settlement_expiry(current_slot: u64, expiry_slot: u64) -> Result<()> {
    require!(current_slot < expiry_slot, ShadowError::Expired);
    Ok(())
}

fn require_settlement_liveness(expiry_slot: u64) -> Result<()> {
    validate_settlement_expiry(Clock::get()?.slot, expiry_slot)
}

fn calculate_profit_split(
    post_vault_balance: u64,
    pre_vault_balance: u64,
    committed_obligations: u64,
    minimum_net_profit: u64,
) -> Result<(u64, u64, u64)> {
    let required_post_repayment = pre_vault_balance
        .checked_add(committed_obligations)
        .ok_or(ShadowError::ArithmeticOverflow)?;
    require!(
        post_vault_balance >= required_post_repayment,
        ShadowError::RepaymentOrObligationShortfall
    );
    let eligible_profit = post_vault_balance
        .checked_sub(required_post_repayment)
        .ok_or(ShadowError::ArithmeticUnderflow)?;
    require!(
        eligible_profit > minimum_net_profit,
        ShadowError::NetProfitInsufficient
    );
    let paymaster_share = u64::try_from(
        (eligible_profit as u128)
            .checked_mul(PAYMASTER_BPS as u128)
            .ok_or(ShadowError::ArithmeticOverflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(ShadowError::ArithmeticUnderflow)?,
    )
    .map_err(|_| ShadowError::ArithmeticOverflow)?;
    let treasury_share = eligible_profit
        .checked_sub(paymaster_share)
        .ok_or(ShadowError::ArithmeticUnderflow)?;
    Ok((eligible_profit, paymaster_share, treasury_share))
}

struct VaultTransferAccounts<'a, 'info> {
    token_program: &'a Program<'info, Token>,
    profit_vault: &'a Account<'info, TokenAccount>,
    profit_mint: &'a Account<'info, Mint>,
    destination: &'a Account<'info, TokenAccount>,
    vault_authority: &'a UncheckedAccount<'info>,
}

fn transfer_from_vault<'info>(
    accounts: VaultTransferAccounts<'_, 'info>,
    config_key: Pubkey,
    vault_authority_bump: u8,
    amount: u64,
) -> Result<()> {
    let bump = [vault_authority_bump];
    let signer_seeds: &[&[u8]] = &[b"vault_authority", config_key.as_ref(), &bump];
    let signer = &[signer_seeds];
    let cpi_accounts = TransferChecked {
        from: accounts.profit_vault.to_account_info(),
        mint: accounts.profit_mint.to_account_info(),
        to: accounts.destination.to_account_info(),
        authority: accounts.vault_authority.to_account_info(),
    };
    token::transfer_checked(
        CpiContext::new_with_signer(accounts.token_program.key(), cpi_accounts, signer),
        amount,
        accounts.profit_mint.decimals,
    )
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub governance: Signer<'info>,
    #[account(
        init,
        payer = governance,
        space = 8 + PaymasterConfig::LEN,
        seeds = [b"config", governance.key().as_ref()],
        bump
    )]
    pub config: Account<'info, PaymasterConfig>,
    /// CHECK: PDA derives from the config and signs only approved SPL token transfers.
    #[account(seeds = [b"vault_authority", config.key().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    pub profit_mint: Account<'info, Mint>,
    #[account(
        token::mint = profit_mint,
        token::authority = vault_authority,
        token::token_program = token_program
    )]
    pub profit_vault: Account<'info, TokenAccount>,
    #[account(
        token::mint = profit_mint,
        token::token_program = token_program
    )]
    pub paymaster_destination: Account<'info, TokenAccount>,
    #[account(
        token::mint = profit_mint,
        token::token_program = token_program
    )]
    pub treasury_destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(mut, has_one = governance @ ShadowError::UnauthorizedGovernance)]
    pub config: Account<'info, PaymasterConfig>,
    pub governance: Signer<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PrepareSettlementArgs {
    pub nonce: [u8; 32],
    pub manifest_hash: [u8; 32],
    pub expiry_slot: u64,
    pub pre_vault_balance: u64,
    pub committed_obligations: u64,
    pub minimum_net_profit: u64,
}

#[derive(Accounts)]
#[instruction(args: PrepareSettlementArgs)]
pub struct PrepareSettlement<'info> {
    #[account(
        mut,
        has_one = governance @ ShadowError::UnauthorizedGovernance,
        has_one = agent @ ShadowError::UnauthorizedAgent
    )]
    pub config: Account<'info, PaymasterConfig>,
    #[account(mut)]
    pub governance: Signer<'info>,
    pub agent: Signer<'info>,
    /// CHECK: PDA is constrained and is the sole permitted vault authority.
    #[account(
        seeds = [b"vault_authority", config.key().as_ref()],
        bump = config.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        address = config.profit_vault @ ShadowError::UnexpectedVault,
        token::mint = profit_mint,
        token::authority = vault_authority,
        token::token_program = token_program
    )]
    pub profit_vault: Account<'info, TokenAccount>,
    #[account(address = config.profit_mint @ ShadowError::UnexpectedMint)]
    pub profit_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = governance,
        space = 8 + SettlementRecord::LEN,
        seeds = [b"settlement", config.key().as_ref(), args.nonce.as_ref()],
        bump
    )]
    pub settlement: Account<'info, SettlementRecord>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeSettlement<'info> {
    #[account(
        has_one = agent @ ShadowError::UnauthorizedAgent,
        constraint = !config.paused @ ShadowError::ProtocolPaused
    )]
    pub config: Account<'info, PaymasterConfig>,
    pub agent: Signer<'info>,
    /// CHECK: PDA is constrained and only validates the configured token authority.
    #[account(
        seeds = [b"vault_authority", config.key().as_ref()],
        bump = config.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = config @ ShadowError::SettlementConfigMismatch,
        constraint = settlement.agent == agent.key() @ ShadowError::UnauthorizedAgent
    )]
    pub settlement: Account<'info, SettlementRecord>,
    #[account(address = config.profit_mint @ ShadowError::UnexpectedMint)]
    pub profit_mint: Account<'info, Mint>,
    #[account(
        address = config.profit_vault @ ShadowError::UnexpectedVault,
        token::mint = profit_mint,
        token::authority = vault_authority,
        token::token_program = token_program
    )]
    pub profit_vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributePaymaster<'info> {
    #[account(constraint = !config.paused @ ShadowError::ProtocolPaused)]
    pub config: Account<'info, PaymasterConfig>,
    /// CHECK: PDA is constrained and signs only token transfer from the fixed vault.
    #[account(
        seeds = [b"vault_authority", config.key().as_ref()],
        bump = config.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, has_one = config @ ShadowError::SettlementConfigMismatch)]
    pub settlement: Account<'info, SettlementRecord>,
    #[account(address = config.profit_mint @ ShadowError::UnexpectedMint)]
    pub profit_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = config.profit_vault @ ShadowError::UnexpectedVault,
        token::mint = profit_mint,
        token::authority = vault_authority,
        token::token_program = token_program
    )]
    pub profit_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = config.paymaster_destination @ ShadowError::UnexpectedDestination,
        token::mint = profit_mint,
        token::token_program = token_program
    )]
    pub paymaster_destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SettleTreasury<'info> {
    #[account(constraint = !config.paused @ ShadowError::ProtocolPaused)]
    pub config: Account<'info, PaymasterConfig>,
    /// CHECK: PDA is constrained and signs only token transfer from the fixed vault.
    #[account(
        seeds = [b"vault_authority", config.key().as_ref()],
        bump = config.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, has_one = config @ ShadowError::SettlementConfigMismatch)]
    pub settlement: Account<'info, SettlementRecord>,
    #[account(address = config.profit_mint @ ShadowError::UnexpectedMint)]
    pub profit_mint: Account<'info, Mint>,
    #[account(
        mut,
        address = config.profit_vault @ ShadowError::UnexpectedVault,
        token::mint = profit_mint,
        token::authority = vault_authority,
        token::token_program = token_program
    )]
    pub profit_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        address = config.treasury_destination @ ShadowError::UnexpectedDestination,
        token::mint = profit_mint,
        token::token_program = token_program
    )]
    pub treasury_destination: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct PaymasterConfig {
    pub governance: Pubkey,
    pub agent: Pubkey,
    pub profit_mint: Pubkey,
    pub profit_vault: Pubkey,
    pub paymaster_destination: Pubkey,
    pub treasury_destination: Pubkey,
    pub vault_authority_bump: u8,
    pub paused: bool,
}

impl PaymasterConfig {
    pub const LEN: usize = (32 * 6) + 2;
}

#[account]
pub struct SettlementRecord {
    pub config: Pubkey,
    pub agent: Pubkey,
    pub nonce: [u8; 32],
    pub manifest_hash: [u8; 32],
    pub expiry_slot: u64,
    pub pre_vault_balance: u64,
    pub committed_obligations: u64,
    pub minimum_net_profit: u64,
    pub eligible_profit: u64,
    pub paymaster_share: u64,
    pub treasury_share: u64,
    pub state: SettlementState,
    pub bump: u8,
}

impl SettlementRecord {
    pub const LEN: usize = (32 * 4) + (8 * 7) + 2;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SettlementState {
    Prepared,
    Finalized,
    Distributed,
    Complete,
}

#[event]
pub struct PauseStateChanged {
    pub config: Pubkey,
    pub paused: bool,
    pub governance: Pubkey,
}

#[event]
pub struct SettlementPrepared {
    pub settlement: Pubkey,
    pub manifest_hash: [u8; 32],
    pub nonce: [u8; 32],
    pub expiry_slot: u64,
    pub pre_vault_balance: u64,
    pub committed_obligations: u64,
}

#[event]
pub struct SettlementFinalized {
    pub settlement: Pubkey,
    pub manifest_hash: [u8; 32],
    pub eligible_profit: u64,
    pub paymaster_share: u64,
    pub treasury_share: u64,
}

#[event]
pub struct PaymasterDistributed {
    pub settlement: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TreasurySettled {
    pub settlement: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finalize_rejects_substitute_vault() {
        let configured_vault = Pubkey::new_unique();
        let substitute_vault = Pubkey::new_unique();

        let error = validate_configured_profit_vault(substitute_vault, configured_vault)
            .expect_err("a substitute vault must be rejected");

        assert!(error
            .to_string()
            .contains("error_name: \"UnexpectedVault\""));
    }

    #[test]
    fn finalize_accepts_configured_vault() {
        let configured_vault = Pubkey::new_unique();

        let result = validate_configured_profit_vault(configured_vault, configured_vault);

        assert!(result.is_ok());
    }

    #[test]
    fn initialization_rejects_vault_destination_alias() {
        let vault = Pubkey::new_unique();
        let treasury = Pubkey::new_unique();

        let error = validate_settlement_destinations(vault, vault, treasury)
            .expect_err("a destination may not alias the profit vault");

        assert!(error
            .to_string()
            .contains("error_name: \"VaultDestinationAlias\""));
    }

    #[test]
    fn initialization_rejects_duplicate_destinations() {
        let vault = Pubkey::new_unique();
        let destination = Pubkey::new_unique();

        let error = validate_settlement_destinations(vault, destination, destination)
            .expect_err("paymaster and treasury destinations must be distinct");

        assert!(error
            .to_string()
            .contains("error_name: \"DuplicateDestinations\""));
    }

    #[test]
    fn settlement_expiry_rejects_current_or_past_slot() {
        let current_slot_error = validate_settlement_expiry(100, 100)
            .expect_err("settlement must expire at its expiry slot");
        let past_slot_error = validate_settlement_expiry(101, 100)
            .expect_err("settlement must expire after its expiry slot");

        assert!(current_slot_error
            .to_string()
            .contains("error_name: \"Expired\""));
        assert!(past_slot_error
            .to_string()
            .contains("error_name: \"Expired\""));
        assert!(validate_settlement_expiry(99, 100).is_ok());
    }

    #[test]
    fn profit_split_uses_exact_fifteen_eighty_five_remainder() {
        let result = calculate_profit_split(1_020_000, 1_000_000, 5_000, 10_000).unwrap();
        assert_eq!(result, (15_000, 2_250, 12_750));
    }

    #[test]
    fn profit_split_rejects_repayment_shortfall() {
        let result = calculate_profit_split(1_004, 1_000, 5, 1);
        assert!(result.is_err());
    }

    #[test]
    fn profit_split_requires_strict_minimum_profit() {
        let result = calculate_profit_split(1_015, 1_000, 5, 10);
        assert!(result.is_err());
    }

    #[test]
    fn profit_split_handles_maximum_u64_eligible_profit() {
        let (eligible, paymaster, treasury) =
            calculate_profit_split(u64::MAX, 0, 0, 0).expect("u128 intermediate must be safe");

        assert_eq!(eligible, u64::MAX);
        assert_eq!(paymaster.checked_add(treasury), Some(eligible));
    }

    #[test]
    fn profit_split_rejects_overflow() {
        let result = calculate_profit_split(u64::MAX, u64::MAX, 1, 1);
        assert!(result.is_err());
    }
}

#[error_code]
pub enum ShadowError {
    #[msg("Only the configured governance authority may perform this action.")]
    UnauthorizedGovernance,
    #[msg("Only the configured zero-capital agent may authorize this settlement transition.")]
    UnauthorizedAgent,
    #[msg("The protocol is paused.")]
    ProtocolPaused,
    #[msg("The settlement or authorization has expired.")]
    Expired,
    #[msg("Settlement state transition is not permitted.")]
    InvalidStateTransition,
    #[msg("Arithmetic overflow occurred.")]
    ArithmeticOverflow,
    #[msg("Arithmetic underflow occurred.")]
    ArithmeticUnderflow,
    #[msg("Profit vault balance does not equal the bound pre-execution balance.")]
    PreBalanceMismatch,
    #[msg("Repayment or another committed obligation is not fully covered.")]
    RepaymentOrObligationShortfall,
    #[msg("Worst-case net profit does not exceed the configured minimum.")]
    NetProfitInsufficient,
    #[msg("The settlement does not belong to the provided configuration.")]
    SettlementConfigMismatch,
    #[msg("The provided mint is not the source-locked profit mint.")]
    UnexpectedMint,
    #[msg("The provided destination is not source-locked in configuration.")]
    UnexpectedDestination,
    #[msg("The provided vault is not source-locked in configuration.")]
    UnexpectedVault,
    #[msg("Paymaster and treasury destinations must be distinct.")]
    DuplicateDestinations,
    #[msg("A settlement destination may not alias the protocol profit vault.")]
    VaultDestinationAlias,
    #[msg("The configured agent is invalid.")]
    InvalidAgent,
    #[msg("Minimum net profit must be strictly positive.")]
    InvalidMinimumProfit,
}
