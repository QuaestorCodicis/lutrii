use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::state::PlatformConfig;
use crate::errors::ErrorCode;

/// Initialize the platform configuration
///
/// This instruction can only be called once to set up the fee collection wallets.
/// The authority will be able to update the config later via update_config.
///
/// # Arguments
/// * `fee_wallet_usdc` - Token account to receive USDC fees
/// * `fee_wallet_usd1` - Token account to receive USD1 fees
///
/// # Security
/// - Can only be called once (init constraint)
/// - Authority becomes admin with update permissions
/// - Fee wallets must be valid token accounts for USDC/USD1 mints
#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = PlatformConfig::LEN,
        seeds = [b"platform_config"],
        bump
    )]
    pub config: Account<'info, PlatformConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// Fee wallet for USDC (must be valid USDC token account)
    #[account(
        constraint = fee_wallet_usdc.mint == usdc_mint.key() @ ErrorCode::InvalidFeeWalletMint
    )]
    pub fee_wallet_usdc: InterfaceAccount<'info, TokenAccount>,

    /// Fee wallet for USD1 (must be valid USD1 token account)
    #[account(
        constraint = fee_wallet_usd1.mint == usd1_mint.key() @ ErrorCode::InvalidFeeWalletMint
    )]
    pub fee_wallet_usd1: InterfaceAccount<'info, TokenAccount>,

    /// USDC mint (for validation)
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    /// USD1 mint (for validation)
    pub usd1_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(ctx: Context<InitializeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.config;

    // Set core config
    config.authority = ctx.accounts.authority.key();
    config.fee_wallet_usdc = ctx.accounts.fee_wallet_usdc.key();
    config.fee_wallet_usd1 = ctx.accounts.fee_wallet_usd1.key();
    config.bump = ctx.bumps.config;

    // Initialize reserved fields to default (ready for Phase 3)
    config.reserved1 = Pubkey::default();
    config.reserved2 = Pubkey::default();
    config.reserved3 = Pubkey::default();
    config.reserved4 = 0;
    config.reserved5 = [0; 63];

    msg!("✅ Platform config initialized");
    msg!("Authority: {}", config.authority);
    msg!("USDC fee wallet: {}", config.fee_wallet_usdc);
    msg!("USD1 fee wallet: {}", config.fee_wallet_usd1);

    Ok(())
}
