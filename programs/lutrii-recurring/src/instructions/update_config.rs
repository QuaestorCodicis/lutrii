use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use crate::state::PlatformConfig;
use crate::errors::ErrorCode;

/// Update the platform configuration (admin only)
///
/// Allows the authority to update fee collection wallets if needed.
/// This is critical for wallet rotation or migrating to new fee wallets.
///
/// # Arguments
/// * `new_fee_wallet_usdc` - Optional new USDC fee wallet
/// * `new_fee_wallet_usd1` - Optional new USD1 fee wallet
/// * `new_authority` - Optional new authority (for admin rotation)
///
/// # Security
/// - Only current authority can call this
/// - has_one constraint enforces authority check
/// - All new wallets validated as proper token accounts
#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"platform_config"],
        bump = config.bump,
        has_one = authority @ ErrorCode::UnauthorizedAdmin
    )]
    pub config: Account<'info, PlatformConfig>,

    pub authority: Signer<'info>,

    /// New USDC fee wallet (optional)
    #[account(
        constraint = new_fee_wallet_usdc.mint == usdc_mint.key() @ ErrorCode::InvalidFeeWalletMint
    )]
    pub new_fee_wallet_usdc: Option<InterfaceAccount<'info, TokenAccount>>,

    /// New USD1 fee wallet (optional)
    #[account(
        constraint = new_fee_wallet_usd1.mint == usd1_mint.key() @ ErrorCode::InvalidFeeWalletMint
    )]
    pub new_fee_wallet_usd1: Option<InterfaceAccount<'info, TokenAccount>>,

    /// USDC mint (for validation)
    pub usdc_mint: InterfaceAccount<'info, Mint>,

    /// USD1 mint (for validation)
    pub usd1_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handler(
    ctx: Context<UpdateConfig>,
    new_authority: Option<Pubkey>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;

    let mut updated = false;

    // Update USDC fee wallet if provided
    if let Some(new_usdc_wallet) = &ctx.accounts.new_fee_wallet_usdc {
        let old_wallet = config.fee_wallet_usdc;
        config.fee_wallet_usdc = new_usdc_wallet.key();
        msg!("USDC fee wallet updated");
        msg!("  Old: {}", old_wallet);
        msg!("  New: {}", config.fee_wallet_usdc);
        updated = true;
    }

    // Update USD1 fee wallet if provided
    if let Some(new_usd1_wallet) = &ctx.accounts.new_fee_wallet_usd1 {
        let old_wallet = config.fee_wallet_usd1;
        config.fee_wallet_usd1 = new_usd1_wallet.key();
        msg!("USD1 fee wallet updated");
        msg!("  Old: {}", old_wallet);
        msg!("  New: {}", config.fee_wallet_usd1);
        updated = true;
    }

    // Update authority if provided
    if let Some(new_auth) = new_authority {
        let old_authority = config.authority;
        config.authority = new_auth;
        msg!("Authority updated");
        msg!("  Old: {}", old_authority);
        msg!("  New: {}", config.authority);
        updated = true;
    }

    require!(updated, ErrorCode::NoUpdateProvided);

    msg!("✅ Platform config updated successfully");

    Ok(())
}
