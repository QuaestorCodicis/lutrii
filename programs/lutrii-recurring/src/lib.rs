use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{
    approve_checked, transfer_checked, revoke, ApproveChecked, Mint, Revoke, TokenAccount,
    TokenInterface, TransferChecked,
};

declare_id!("146BGDDLG4yRYXfNCCDdRRmCAYTrGddCgY14n4ekxJyF");

// Constants
const SECONDS_PER_DAY: i64 = 86_400;
const BASIS_POINTS_DIVISOR: u128 = 10_000;
const MIN_FREQUENCY_SECONDS: i64 = 3_600; // 1 hour
const MAX_FREQUENCY_SECONDS: i64 = 31_536_000; // 1 year
const MAX_MERCHANT_NAME_LEN: usize = 32;
const MAX_FEE_BASIS_POINTS: u16 = 500; // 5% max
const MIN_FEE_BASIS_POINTS: u16 = 1; // 0.01% min

/// Program version for tracking upgrades
#[constant]
pub const VERSION: &str = "1.0.0";

/// Lutrii Recurring Payment Program
///
/// Enables users to create non-custodial recurring subscriptions with:
/// - Token delegation model for secure automated payments
/// - Comprehensive security controls and circuit breakers
/// - Velocity limits with automatic time-based resets
/// - Price variance protection to prevent unauthorized amount changes
/// - Full user control with pause/resume/cancel capabilities
#[program]
pub mod lutrii_recurring {
    use super::*;

    /// Initialize the platform state (admin only, one-time)
    ///
    /// Sets up global platform configuration including fees, volume limits,
    /// and administrative controls.
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        daily_volume_limit: u64,
        fee_basis_points: u16,
    ) -> Result<()> {
        // Validate fee parameters
        require!(
            fee_basis_points >= MIN_FEE_BASIS_POINTS,
            ErrorCode::FeeTooLow
        );
        require!(
            fee_basis_points <= MAX_FEE_BASIS_POINTS,
            ErrorCode::FeeTooHigh
        );

        let platform = &mut ctx.accounts.platform_state;
        let clock = Clock::get()?;

        platform.authority = ctx.accounts.authority.key();
        platform.daily_volume_limit = daily_volume_limit;
        platform.total_volume_24h = 0;
        platform.last_volume_reset = clock.unix_timestamp;
        platform.failed_tx_count = 0;
        platform.emergency_pause = false;
        platform.fee_basis_points = fee_basis_points;
        platform.min_fee = 10_000; // 0.01 USDC
        platform.max_fee = 500_000; // 0.50 USDC
        platform.total_subscriptions = 0;
        platform.total_transactions = 0;
        platform.bump = ctx.bumps.platform_state;

        emit!(PlatformInitialized {
            authority: platform.authority,
            fee_basis_points,
            daily_volume_limit,
            version: VERSION.to_string(),
        });

        msg!("Lutrii platform initialized - version {}", VERSION);
        Ok(())
    }

    /// Create a new subscription with token delegation
    ///
    /// User approves the subscription PDA to spend up to lifetime_cap on their behalf.
    /// This enables automated payments without requiring user signatures.
    pub fn create_subscription(
        ctx: Context<CreateSubscription>,
        amount: u64,
        frequency_seconds: i64,
        max_per_transaction: u64,
        lifetime_cap: u64,
        merchant_name: String,
    ) -> Result<()> {
        let platform = &ctx.accounts.platform_state;
        require!(!platform.emergency_pause, ErrorCode::SystemPaused);

        // Validate inputs
        require!(
            frequency_seconds >= MIN_FREQUENCY_SECONDS,
            ErrorCode::FrequencyTooShort
        );
        require!(
            frequency_seconds <= MAX_FREQUENCY_SECONDS,
            ErrorCode::FrequencyTooLong
        );
        require!(
            !merchant_name.is_empty() && merchant_name.len() <= MAX_MERCHANT_NAME_LEN,
            ErrorCode::InvalidMerchantName
        );
        require!(amount > 0, ErrorCode::AmountTooLow);
        require!(
            amount <= max_per_transaction,
            ErrorCode::ExceedsTransactionCap
        );
        require!(amount <= lifetime_cap, ErrorCode::ExceedsLifetimeCap);

        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;

        // Initialize subscription
        subscription.user = ctx.accounts.user.key();
        subscription.merchant = ctx.accounts.merchant.key();
        subscription.user_token_account = ctx.accounts.user_token_account.key();
        subscription.merchant_token_account = ctx.accounts.merchant_token_account.key();
        subscription.amount = amount;
        subscription.original_amount = amount; // Store for variance check
        subscription.frequency_seconds = frequency_seconds;
        subscription.last_payment = 0;
        subscription.next_payment = clock.unix_timestamp + frequency_seconds;
        subscription.total_paid = 0;
        subscription.payment_count = 0;
        subscription.is_active = true;
        subscription.is_paused = false;
        subscription.max_per_transaction = max_per_transaction;
        subscription.lifetime_cap = lifetime_cap;
        subscription.merchant_name = merchant_name.clone();
        subscription.created_at = clock.unix_timestamp;
        subscription.bump = ctx.bumps.subscription;

        // Approve subscription PDA to spend user's tokens (delegation model)
        // This allows the PDA to execute payments on user's behalf
        approve_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                ApproveChecked {
                    to: ctx.accounts.user_token_account.to_account_info(),
                    delegate: subscription.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            lifetime_cap,
            ctx.accounts.mint.decimals,
        )?;

        // Update platform stats
        let platform_state = &mut ctx.accounts.platform_state;
        platform_state.total_subscriptions = platform_state
            .total_subscriptions
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        emit!(SubscriptionCreated {
            subscription: subscription.key(),
            user: subscription.user,
            merchant: subscription.merchant,
            amount,
            frequency_seconds,
            next_payment: subscription.next_payment,
        });

        msg!(
            "Subscription created: {} USDC every {} seconds",
            amount as f64 / 1_000_000.0,
            frequency_seconds
        );
        Ok(())
    }

    /// Execute a scheduled payment
    ///
    /// Can be called by anyone once a payment is due. Uses delegated authority
    /// from subscription PDA to transfer tokens from user to merchant.
    pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let platform = &mut ctx.accounts.platform_state;
        let clock = Clock::get()?;

        // Auto-reset daily volume if 24h passed
        if clock.unix_timestamp >= platform.last_volume_reset + SECONDS_PER_DAY {
            platform.total_volume_24h = 0;
            platform.last_volume_reset = clock.unix_timestamp;
            msg!("Daily volume reset");
        }

        // Security checks
        require!(!platform.emergency_pause, ErrorCode::SystemPaused);
        require!(subscription.is_active, ErrorCode::SubscriptionInactive);
        require!(!subscription.is_paused, ErrorCode::SubscriptionPaused);
        require!(
            clock.unix_timestamp >= subscription.next_payment,
            ErrorCode::PaymentNotDue
        );

        // Check lifetime cap
        let new_total = subscription
            .total_paid
            .checked_add(subscription.amount)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            new_total <= subscription.lifetime_cap,
            ErrorCode::ExceedsLifetimeCap
        );

        // Check velocity limits
        let new_volume = platform
            .total_volume_24h
            .checked_add(subscription.amount)
            .ok_or(ErrorCode::Overflow)?;
        require!(
            new_volume <= platform.daily_volume_limit,
            ErrorCode::VelocityExceeded
        );

        // Price variance protection (10% max change from original)
        if subscription.payment_count > 0 {
            let variance = subscription
                .amount
                .abs_diff(subscription.original_amount);
            let max_variance = subscription
                .original_amount
                .checked_div(10)
                .ok_or(ErrorCode::Overflow)?;
            require!(
                variance <= max_variance,
                ErrorCode::PriceVarianceExceeded
            );
        }

        // Calculate platform fee
        let fee = calculate_fee(
            subscription.amount,
            platform.fee_basis_points,
            platform.min_fee,
            platform.max_fee,
        )?;
        let merchant_amount = subscription
            .amount
            .checked_sub(fee)
            .ok_or(ErrorCode::InsufficientAmount)?;

        // Generate PDA signer seeds
        let seeds = &[
            b"subscription",
            subscription.user.as_ref(),
            subscription.merchant.as_ref(),
            &[subscription.bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer to merchant using delegated authority
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.merchant_token_account.to_account_info(),
                    authority: subscription.to_account_info(), // PDA is delegate
                },
                signer,
            ),
            merchant_amount,
            ctx.accounts.mint.decimals,
        )?;

        // Transfer platform fee
        if fee > 0 {
            transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    TransferChecked {
                        from: ctx.accounts.user_token_account.to_account_info(),
                        mint: ctx.accounts.mint.to_account_info(),
                        to: ctx.accounts.platform_fee_account.to_account_info(),
                        authority: subscription.to_account_info(),
                    },
                    signer,
                ),
                fee,
                ctx.accounts.mint.decimals,
            )?;
        }

        // Update subscription state
        subscription.last_payment = clock.unix_timestamp;
        subscription.next_payment = clock.unix_timestamp + subscription.frequency_seconds;
        subscription.total_paid = new_total;
        subscription.payment_count = subscription
            .payment_count
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        // Update platform stats
        platform.total_volume_24h = new_volume;
        platform.total_transactions = platform
            .total_transactions
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        emit!(PaymentExecuted {
            subscription: subscription.key(),
            amount: subscription.amount,
            fee,
            merchant_received: merchant_amount,
            payment_count: subscription.payment_count,
            timestamp: clock.unix_timestamp,
        });

        msg!(
            "Payment executed: {} USDC (fee: {} USDC)",
            merchant_amount as f64 / 1_000_000.0,
            fee as f64 / 1_000_000.0
        );
        Ok(())
    }

    /// Pause a subscription
    ///
    /// User can pause their subscription at any time. No payments will be
    /// executed while paused, but the subscription remains active.
    pub fn pause_subscription(ctx: Context<ModifySubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        require!(subscription.is_active, ErrorCode::SubscriptionInactive);
        require!(!subscription.is_paused, ErrorCode::AlreadyPaused);

        subscription.is_paused = true;

        emit!(SubscriptionPaused {
            subscription: subscription.key(),
            user: subscription.user,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Subscription paused");
        Ok(())
    }

    /// Resume a paused subscription
    ///
    /// Resumes a paused subscription and schedules the next payment
    /// based on the current time plus frequency.
    pub fn resume_subscription(ctx: Context<ModifySubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        let clock = Clock::get()?;

        require!(subscription.is_active, ErrorCode::SubscriptionInactive);
        require!(subscription.is_paused, ErrorCode::NotPaused);

        subscription.is_paused = false;
        subscription.next_payment = clock.unix_timestamp + subscription.frequency_seconds;

        emit!(SubscriptionResumed {
            subscription: subscription.key(),
            user: subscription.user,
            next_payment: subscription.next_payment,
            timestamp: clock.unix_timestamp,
        });

        msg!("Subscription resumed");
        Ok(())
    }

    /// Cancel a subscription permanently
    ///
    /// Revokes the token delegation and marks subscription as inactive.
    /// User can close the account after cancellation to reclaim rent.
    pub fn cancel_subscription(ctx: Context<CancelSubscription>) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        require!(subscription.is_active, ErrorCode::SubscriptionInactive);

        // Revoke delegation
        revoke(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Revoke {
                source: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ))?;

        subscription.is_active = false;
        subscription.is_paused = false;

        // Update platform stats
        let platform = &mut ctx.accounts.platform_state;
        platform.total_subscriptions = platform.total_subscriptions.saturating_sub(1);

        emit!(SubscriptionCancelled {
            subscription: subscription.key(),
            user: subscription.user,
            total_paid: subscription.total_paid,
            payment_count: subscription.payment_count,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Subscription cancelled");
        Ok(())
    }

    /// Close a cancelled subscription and reclaim rent
    ///
    /// Can only be called on inactive subscriptions. Returns rent to user.
    pub fn close_subscription(ctx: Context<CloseSubscription>) -> Result<()> {
        let subscription = &ctx.accounts.subscription;
        require!(!subscription.is_active, ErrorCode::SubscriptionStillActive);

        msg!("Subscription account closed, rent reclaimed");
        Ok(())
    }

    /// Update spending limits
    ///
    /// User can update their safety limits at any time. New limits must be
    /// compatible with current state and subscription amount.
    pub fn update_limits(
        ctx: Context<UpdateLimits>,
        new_max_per_transaction: Option<u64>,
        new_lifetime_cap: Option<u64>,
    ) -> Result<()> {
        let subscription = &mut ctx.accounts.subscription;
        require!(subscription.is_active, ErrorCode::SubscriptionInactive);

        if let Some(max_tx) = new_max_per_transaction {
            require!(
                subscription.amount <= max_tx,
                ErrorCode::ExceedsTransactionCap
            );
            subscription.max_per_transaction = max_tx;
        }

        if let Some(lifetime) = new_lifetime_cap {
            require!(
                subscription.total_paid <= lifetime,
                ErrorCode::ExceedsLifetimeCap
            );

            // Update delegation amount if increasing cap
            if lifetime > subscription.lifetime_cap {
                approve_checked(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        ApproveChecked {
                            to: ctx.accounts.user_token_account.to_account_info(),
                            delegate: subscription.to_account_info(),
                            authority: ctx.accounts.user.to_account_info(),
                            mint: ctx.accounts.mint.to_account_info(),
                        },
                    ),
                    lifetime,
                    ctx.accounts.mint.decimals,
                )?;
            }

            subscription.lifetime_cap = lifetime;
        }

        emit!(LimitsUpdated {
            subscription: subscription.key(),
            max_per_transaction: subscription.max_per_transaction,
            lifetime_cap: subscription.lifetime_cap,
        });

        msg!("Limits updated");
        Ok(())
    }

    /// Emergency pause (admin only)
    ///
    /// Immediately stops all payments system-wide. Should only be used
    /// in case of detected exploit or critical bug.
    pub fn emergency_pause(ctx: Context<AdminAction>) -> Result<()> {
        let platform = &mut ctx.accounts.platform_state;
        platform.emergency_pause = true;

        emit!(EmergencyPauseActivated {
            timestamp: Clock::get()?.unix_timestamp,
            reason: "Admin triggered emergency pause".to_string(),
        });

        msg!("⚠️ EMERGENCY PAUSE ACTIVATED");
        Ok(())
    }

    /// Unpause system (admin only)
    ///
    /// Resumes normal operations after emergency pause. Resets volume counters.
    pub fn emergency_unpause(ctx: Context<AdminAction>) -> Result<()> {
        let platform = &mut ctx.accounts.platform_state;
        let clock = Clock::get()?;

        platform.emergency_pause = false;
        platform.total_volume_24h = 0;
        platform.last_volume_reset = clock.unix_timestamp;
        platform.failed_tx_count = 0;

        msg!("✅ System unpaused, counters reset");
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
pub struct PlatformState {
    pub authority: Pubkey,              // 32
    pub daily_volume_limit: u64,        // 8
    pub total_volume_24h: u64,          // 8
    pub last_volume_reset: i64,         // 8
    pub failed_tx_count: u16,           // 2
    pub emergency_pause: bool,          // 1
    pub fee_basis_points: u16,          // 2
    pub min_fee: u64,                   // 8
    pub max_fee: u64,                   // 8
    pub total_subscriptions: u64,       // 8
    pub total_transactions: u64,        // 8
    pub bump: u8,                       // 1
}

impl PlatformState {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 2 + 1 + 2 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Subscription {
    pub user: Pubkey,                      // 32
    pub merchant: Pubkey,                  // 32
    pub user_token_account: Pubkey,        // 32
    pub merchant_token_account: Pubkey,    // 32
    pub amount: u64,                       // 8
    pub original_amount: u64,              // 8 - for variance check
    pub frequency_seconds: i64,            // 8
    pub last_payment: i64,                 // 8
    pub next_payment: i64,                 // 8
    pub total_paid: u64,                   // 8
    pub payment_count: u32,                // 4
    pub is_active: bool,                   // 1
    pub is_paused: bool,                   // 1
    pub max_per_transaction: u64,          // 8
    pub lifetime_cap: u64,                 // 8
    pub merchant_name: String,             // 4 + 32
    pub created_at: i64,                   // 8
    pub bump: u8,                          // 1
}

impl Subscription {
    pub const MAX_NAME_LEN: usize = MAX_MERCHANT_NAME_LEN;
    pub const SPACE: usize = 8 + // discriminator
        32 + 32 + 32 + 32 + // pubkeys
        8 + 8 + 8 + 8 + 8 + 8 + // u64/i64 fields
        4 + 1 + 1 + 8 + 8 + // counters and bools
        (4 + Self::MAX_NAME_LEN) + // string
        8 + 1; // created_at + bump
}

// ============================================================================
// Context Structures
// ============================================================================

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = PlatformState::SPACE,
        seeds = [b"platform"],
        bump
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateSubscription<'info> {
    #[account(
        init,
        payer = user,
        space = Subscription::SPACE,
        seeds = [
            b"subscription",
            user.key().as_ref(),
            merchant.key().as_ref(),
        ],
        bump
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        seeds = [b"platform"],
        bump = platform_state.bump
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: Merchant address - should be validated against merchant registry in production
    pub merchant: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ErrorCode::InvalidTokenAccountOwner,
        constraint = user_token_account.mint == mint.key() @ ErrorCode::InvalidMint
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_token_account.owner == merchant.key() @ ErrorCode::InvalidTokenAccountOwner,
        constraint = merchant_token_account.mint == mint.key() @ ErrorCode::InvalidMint
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.user.as_ref(),
            subscription.merchant.as_ref(),
        ],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        seeds = [b"platform"],
        bump = platform_state.bump
    )]
    pub platform_state: Account<'info, PlatformState>,

    /// CHECK: User doesn't need to sign for automated payments
    pub user: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = user_token_account.key() == subscription.user_token_account @ ErrorCode::InvalidTokenAccount
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_token_account.key() == subscription.merchant_token_account @ ErrorCode::InvalidTokenAccount
    )]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub platform_fee_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ModifySubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.user.as_ref(),
            subscription.merchant.as_ref(),
        ],
        bump = subscription.bump,
        has_one = user @ ErrorCode::UnauthorizedUser
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        seeds = [b"platform"],
        bump = platform_state.bump
    )]
    pub platform_state: Account<'info, PlatformState>,

    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelSubscription<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.user.as_ref(),
            subscription.merchant.as_ref(),
        ],
        bump = subscription.bump,
        has_one = user @ ErrorCode::UnauthorizedUser
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        seeds = [b"platform"],
        bump = platform_state.bump
    )]
    pub platform_state: Account<'info, PlatformState>,

    #[account(
        mut,
        constraint = user_token_account.key() == subscription.user_token_account @ ErrorCode::InvalidTokenAccount
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub user: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CloseSubscription<'info> {
    #[account(
        mut,
        close = user,
        seeds = [
            b"subscription",
            subscription.user.as_ref(),
            subscription.merchant.as_ref(),
        ],
        bump = subscription.bump,
        has_one = user @ ErrorCode::UnauthorizedUser,
        constraint = !subscription.is_active @ ErrorCode::SubscriptionStillActive
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateLimits<'info> {
    #[account(
        mut,
        seeds = [
            b"subscription",
            subscription.user.as_ref(),
            subscription.merchant.as_ref(),
        ],
        bump = subscription.bump,
        has_one = user @ ErrorCode::UnauthorizedUser
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(
        mut,
        constraint = user_token_account.key() == subscription.user_token_account @ ErrorCode::InvalidTokenAccount
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub user: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"platform"],
        bump = platform_state.bump,
        has_one = authority @ ErrorCode::UnauthorizedAdmin
    )]
    pub platform_state: Account<'info, PlatformState>,

    pub authority: Signer<'info>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub fee_basis_points: u16,
    pub daily_volume_limit: u64,
    pub version: String,
}

#[event]
pub struct SubscriptionCreated {
    pub subscription: Pubkey,
    pub user: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub frequency_seconds: i64,
    pub next_payment: i64,
}

#[event]
pub struct PaymentExecuted {
    pub subscription: Pubkey,
    pub amount: u64,
    pub fee: u64,
    pub merchant_received: u64,
    pub payment_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionPaused {
    pub subscription: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionResumed {
    pub subscription: Pubkey,
    pub user: Pubkey,
    pub next_payment: i64,
    pub timestamp: i64,
}

#[event]
pub struct SubscriptionCancelled {
    pub subscription: Pubkey,
    pub user: Pubkey,
    pub total_paid: u64,
    pub payment_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct LimitsUpdated {
    pub subscription: Pubkey,
    pub max_per_transaction: u64,
    pub lifetime_cap: u64,
}

#[event]
pub struct EmergencyPauseActivated {
    pub timestamp: i64,
    pub reason: String,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("System is currently paused for emergency maintenance")]
    SystemPaused,

    #[msg("Subscription is inactive and cannot be modified")]
    SubscriptionInactive,

    #[msg("Subscription is currently paused")]
    SubscriptionPaused,

    #[msg("Payment is not yet due - too early to execute")]
    PaymentNotDue,

    #[msg("Amount exceeds per-transaction safety cap")]
    ExceedsTransactionCap,

    #[msg("Total paid would exceed lifetime safety cap")]
    ExceedsLifetimeCap,

    #[msg("Daily volume limit exceeded - try again tomorrow")]
    VelocityExceeded,

    #[msg("Price changed more than 10% from original - safety check failed")]
    PriceVarianceExceeded,

    #[msg("Subscription is already paused")]
    AlreadyPaused,

    #[msg("Subscription is not paused")]
    NotPaused,

    #[msg("Insufficient amount to cover platform fee")]
    InsufficientAmount,

    #[msg("Arithmetic overflow detected")]
    Overflow,

    #[msg("Frequency must be at least 1 hour (3600 seconds)")]
    FrequencyTooShort,

    #[msg("Frequency cannot exceed 1 year (31536000 seconds)")]
    FrequencyTooLong,

    #[msg("Merchant name must be 1-32 characters")]
    InvalidMerchantName,

    #[msg("Amount must be greater than 0")]
    AmountTooLow,

    #[msg("Fee must be at least 0.01% (1 basis point)")]
    FeeTooLow,

    #[msg("Fee cannot exceed 5% (500 basis points)")]
    FeeTooHigh,

    #[msg("Token account owner does not match expected owner")]
    InvalidTokenAccountOwner,

    #[msg("Token account mint does not match expected mint")]
    InvalidMint,

    #[msg("Invalid token account provided")]
    InvalidTokenAccount,

    #[msg("Subscription must be inactive before closing")]
    SubscriptionStillActive,

    #[msg("Unauthorized: only subscription owner can perform this action")]
    UnauthorizedUser,

    #[msg("Unauthorized: only platform admin can perform this action")]
    UnauthorizedAdmin,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Calculate platform fee with min/max capping
///
/// Uses u128 for intermediate calculations to prevent overflow,
/// then safely converts back to u64.
fn calculate_fee(
    amount: u64,
    basis_points: u16,
    min_fee: u64,
    max_fee: u64,
) -> Result<u64> {
    let fee = (amount as u128)
        .checked_mul(basis_points as u128)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(BASIS_POINTS_DIVISOR)
        .ok_or(ErrorCode::Overflow)?;

    let fee_u64 = u64::try_from(fee).map_err(|_| ErrorCode::Overflow)?;

    Ok(fee_u64.max(min_fee).min(max_fee))
}
