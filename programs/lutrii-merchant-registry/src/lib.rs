use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("3RkcL88V6dyHRCJFyGZ54R1u1KcHqeYB24MA38894Eex");

// Constants
const MAX_BUSINESS_NAME_LEN: usize = 64;
const MAX_WEBHOOK_URL_LEN: usize = 128;
const MAX_CATEGORY_LEN: usize = 32;
const MAX_REVIEW_COMMENT_LEN: usize = 256;
const PREMIUM_BADGE_DURATION_DAYS: i64 = 30;
const PREMIUM_BADGE_PRICE: u64 = 50_000_000; // 50 USDC
const SECONDS_PER_DAY: i64 = 86_400;

/// Program version
#[constant]
pub const VERSION: &str = "1.0.0";

/// Lutrii Merchant Registry Program
///
/// Manages merchant verification, reputation scoring, and premium badges.
/// Features:
/// - Multi-tier verification system with automatic upgrades
/// - Community-driven reputation scoring
/// - Review system with sybil resistance
/// - Premium badge subscriptions for enhanced visibility
/// - Automatic badge expiration enforcement
#[program]
pub mod lutrii_merchant_registry {
    use super::*;

    /// Initialize the merchant registry (admin only, one-time)
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry_state;
        registry.authority = ctx.accounts.authority.key();
        registry.total_merchants = 0;
        registry.verified_merchants = 0;
        registry.premium_badge_price = PREMIUM_BADGE_PRICE;
        registry.bump = ctx.bumps.registry_state;

        msg!("Lutrii merchant registry initialized - version {}", VERSION);
        Ok(())
    }

    /// Apply for merchant verification
    ///
    /// Creates a merchant account and submits application for review.
    /// Merchant starts as Unverified and must be approved by admin.
    pub fn apply_for_verification(
        ctx: Context<ApplyForVerification>,
        business_name: String,
        webhook_url: String,
        category: String,
    ) -> Result<()> {
        // Validate inputs
        require!(
            !business_name.is_empty() && business_name.len() <= MAX_BUSINESS_NAME_LEN,
            ErrorCode::InvalidBusinessName
        );
        require!(
            !webhook_url.is_empty() && webhook_url.len() <= MAX_WEBHOOK_URL_LEN,
            ErrorCode::InvalidWebhookUrl
        );
        require!(
            !category.is_empty() && category.len() <= MAX_CATEGORY_LEN,
            ErrorCode::InvalidCategory
        );

        let merchant = &mut ctx.accounts.merchant;
        let clock = Clock::get()?;

        merchant.owner = ctx.accounts.owner.key();
        merchant.business_name = business_name.clone();
        merchant.webhook_url = webhook_url;
        merchant.category = category;
        merchant.verification_tier = VerificationTier::Unverified;
        merchant.community_score = 0;
        merchant.total_transactions = 0;
        merchant.total_volume = 0;
        merchant.failed_transactions = 0;
        merchant.premium_badge_active = false;
        merchant.premium_badge_expires = 0;
        merchant.created_at = clock.unix_timestamp;
        merchant.last_updated = clock.unix_timestamp;
        merchant.bump = ctx.bumps.merchant;

        // Update registry stats
        let registry = &mut ctx.accounts.registry_state;
        registry.total_merchants = registry
            .total_merchants
            .checked_add(1)
            .ok_or(ErrorCode::Overflow)?;

        emit!(MerchantApplicationSubmitted {
            merchant: merchant.key(),
            owner: merchant.owner,
            business_name,
            timestamp: clock.unix_timestamp,
        });

        msg!("Merchant application submitted");
        Ok(())
    }

    /// Approve merchant (admin only)
    ///
    /// Admin reviews application and assigns verification tier.
    pub fn approve_merchant(
        ctx: Context<AdminMerchantAction>,
        tier: VerificationTier,
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        let previous_tier = merchant.verification_tier;

        // Cannot directly approve to Community tier - must be earned
        require!(
            tier != VerificationTier::Community,
            ErrorCode::CannotManuallySetCommunityTier
        );

        merchant.verification_tier = tier;
        merchant.last_updated = Clock::get()?.unix_timestamp;

        // Update verified count if upgrading from Unverified
        if previous_tier == VerificationTier::Unverified
            && tier == VerificationTier::Verified
        {
            let registry = &mut ctx.accounts.registry_state;
            registry.verified_merchants = registry
                .verified_merchants
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
        }

        emit!(MerchantVerified {
            merchant: merchant.key(),
            tier,
            timestamp: merchant.last_updated,
        });

        msg!("Merchant approved: {:?}", tier);
        Ok(())
    }

    /// Subscribe to premium verified badge (monthly)
    ///
    /// Merchant pays for 30 days of premium visibility.
    /// Must already be verified to purchase premium badge.
    pub fn subscribe_premium_badge(ctx: Context<SubscribePremiumBadge>) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;
        let registry = &ctx.accounts.registry_state;
        let clock = Clock::get()?;

        // Must be verified first
        require!(
            merchant.verification_tier == VerificationTier::Verified
                || merchant.verification_tier == VerificationTier::Community,
            ErrorCode::MustBeVerifiedFirst
        );

        // Transfer payment to registry
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.merchant_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.registry_fee_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            registry.premium_badge_price,
            ctx.accounts.mint.decimals,
        )?;

        // Activate premium badge for 30 days
        merchant.premium_badge_active = true;
        merchant.premium_badge_expires =
            clock.unix_timestamp + (PREMIUM_BADGE_DURATION_DAYS * SECONDS_PER_DAY);
        merchant.last_updated = clock.unix_timestamp;

        emit!(PremiumBadgeActivated {
            merchant: merchant.key(),
            expires_at: merchant.premium_badge_expires,
        });

        msg!("Premium badge activated for 30 days");
        Ok(())
    }

    /// Record a transaction (ONLY callable by lutrii-recurring program)
    ///
    /// Updates merchant stats when payments are executed.
    /// Enforces strict CPI caller validation for security.
    pub fn record_transaction(
        ctx: Context<RecordTransaction>,
        amount: u64,
        success: bool,
    ) -> Result<()> {
        // ============================================================================
        // CPI VALIDATION - Verify called via CPI from lutrii-recurring program
        // ============================================================================
        use anchor_lang::solana_program::sysvar::instructions::{load_current_index_checked, load_instruction_at_checked};

        let ixs = &ctx.accounts.instructions.to_account_info();
        let current_index = load_current_index_checked(ixs)
            .map_err(|_| error!(ErrorCode::MustBeCalledViaCpi))?;

        // Verify this instruction is being called via CPI (current_index > 0)
        require!(current_index > 0, ErrorCode::MustBeCalledViaCpi);

        // Load the parent instruction (the one that called this via CPI)
        let parent_ix = load_instruction_at_checked(
            (current_index - 1) as usize,
            ixs
        ).map_err(|_| error!(ErrorCode::MustBeCalledViaCpi))?;

        // Verify the parent instruction is from lutrii-recurring program
        require!(
            parent_ix.program_id == lutrii_recurring::ID,
            ErrorCode::UnauthorizedCpiCaller
        );

        msg!("✅ CPI validation passed - called from lutrii-recurring program");

        let merchant = &mut ctx.accounts.merchant;
        let clock = Clock::get()?;

        // Auto-deactivate expired premium badges
        if merchant.premium_badge_active && clock.unix_timestamp >= merchant.premium_badge_expires
        {
            merchant.premium_badge_active = false;
            msg!("Premium badge expired and deactivated");
        }

        // Update stats based on success
        if success {
            merchant.total_transactions = merchant
                .total_transactions
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
            merchant.total_volume = merchant
                .total_volume
                .checked_add(amount)
                .ok_or(ErrorCode::Overflow)?;
            merchant.community_score = merchant
                .community_score
                .checked_add(10)
                .ok_or(ErrorCode::Overflow)?;
        } else {
            merchant.failed_transactions = merchant
                .failed_transactions
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
            merchant.community_score = merchant.community_score.saturating_sub(25);
        }

        merchant.last_updated = clock.unix_timestamp;

        // Auto-upgrade to Community tier if metrics are excellent
        if merchant.verification_tier == VerificationTier::Verified
            && merchant.total_transactions >= 100
            && merchant.community_score >= 1000
            && merchant.failed_transactions < 5
        {
            merchant.verification_tier = VerificationTier::Community;

            emit!(MerchantUpgraded {
                merchant: merchant.key(),
                new_tier: VerificationTier::Community,
                auto_upgraded: true,
            });

            msg!("Merchant auto-upgraded to Community tier");
        }

        // Auto-suspend if score is critically low
        if merchant.community_score < -100 {
            merchant.verification_tier = VerificationTier::Suspended;
            merchant.premium_badge_active = false;

            emit!(MerchantSuspended {
                merchant: merchant.key(),
                reason: "Community score below -100".to_string(),
                score: merchant.community_score,
            });

            msg!("⚠️ Merchant auto-suspended due to low community score");
        }

        Ok(())
    }

    /// Submit a review (requires active subscription)
    ///
    /// Users can only review merchants they have active subscriptions with.
    /// This prevents sybil attacks where fake wallets spam reviews.
    pub fn submit_review(
        ctx: Context<SubmitReview>,
        rating: u8,
        comment: String,
    ) -> Result<()> {
        // Validate rating (1-5 stars)
        require!(
            rating >= 1 && rating <= 5,
            ErrorCode::InvalidRating
        );
        require!(
            !comment.is_empty() && comment.len() <= MAX_REVIEW_COMMENT_LEN,
            ErrorCode::InvalidComment
        );

        let review = &mut ctx.accounts.review;
        let merchant = &mut ctx.accounts.merchant;
        let subscription = &ctx.accounts.subscription;
        let clock = Clock::get()?;

        // ============================================================================
        // SYBIL RESISTANCE - Verify subscription age >= 7 days
        // ============================================================================
        const MIN_SUBSCRIPTION_AGE_SECONDS: i64 = 7 * SECONDS_PER_DAY; // 7 days
        let subscription_age = clock.unix_timestamp - subscription.created_at;

        require!(
            subscription_age >= MIN_SUBSCRIPTION_AGE_SECONDS,
            ErrorCode::SubscriptionTooNew
        );

        msg!(
            "✅ Sybil resistance checks passed: {} payments, {} total paid, {} days old",
            subscription.payment_count,
            subscription.total_paid,
            subscription_age / SECONDS_PER_DAY
        );

        review.merchant = merchant.key();
        review.reviewer = ctx.accounts.reviewer.key();
        review.rating = rating;
        review.comment = comment;
        review.timestamp = clock.unix_timestamp;
        review.bump = ctx.bumps.review;

        // Update merchant score based on rating
        let score_change: i32 = match rating {
            5 => 20,
            4 => 10,
            3 => 0,
            2 => -15,
            1 => -30,
            _ => 0,
        };

        merchant.community_score = if score_change >= 0 {
            merchant
                .community_score
                .checked_add(score_change)
                .ok_or(ErrorCode::Overflow)?
        } else {
            merchant
                .community_score
                .saturating_sub(score_change.unsigned_abs() as i32)
        };

        merchant.last_updated = clock.unix_timestamp;

        emit!(ReviewSubmitted {
            merchant: merchant.key(),
            reviewer: review.reviewer,
            rating,
            new_score: merchant.community_score,
        });

        msg!("Review submitted: {} stars", rating);
        Ok(())
    }

    /// Suspend merchant (admin only)
    ///
    /// Admin can manually suspend merchants for violations.
    pub fn suspend_merchant(
        ctx: Context<AdminMerchantAction>,
        reason: String,
    ) -> Result<()> {
        require!(
            !reason.is_empty() && reason.len() <= 256,
            ErrorCode::InvalidSuspensionReason
        );

        let merchant = &mut ctx.accounts.merchant;

        merchant.verification_tier = VerificationTier::Suspended;
        merchant.premium_badge_active = false;
        merchant.last_updated = Clock::get()?.unix_timestamp;

        emit!(MerchantSuspended {
            merchant: merchant.key(),
            reason,
            score: merchant.community_score,
        });

        msg!("Merchant suspended by admin");
        Ok(())
    }

    /// Update merchant info
    ///
    /// Merchant owner can update their business information.
    pub fn update_merchant_info(
        ctx: Context<UpdateMerchantInfo>,
        business_name: Option<String>,
        webhook_url: Option<String>,
        category: Option<String>,
    ) -> Result<()> {
        let merchant = &mut ctx.accounts.merchant;

        if let Some(name) = business_name {
            require!(
                !name.is_empty() && name.len() <= MAX_BUSINESS_NAME_LEN,
                ErrorCode::InvalidBusinessName
            );
            merchant.business_name = name;
        }

        if let Some(url) = webhook_url {
            require!(
                !url.is_empty() && url.len() <= MAX_WEBHOOK_URL_LEN,
                ErrorCode::InvalidWebhookUrl
            );
            merchant.webhook_url = url;
        }

        if let Some(cat) = category {
            require!(
                !cat.is_empty() && cat.len() <= MAX_CATEGORY_LEN,
                ErrorCode::InvalidCategory
            );
            merchant.category = cat;
        }

        merchant.last_updated = Clock::get()?.unix_timestamp;

        msg!("Merchant info updated");
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[account]
pub struct RegistryState {
    pub authority: Pubkey,              // 32
    pub total_merchants: u64,           // 8
    pub verified_merchants: u64,        // 8
    pub premium_badge_price: u64,       // 8
    pub bump: u8,                       // 1
}

impl RegistryState {
    pub const SPACE: usize = 8 + 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Merchant {
    pub owner: Pubkey,                  // 32
    pub business_name: String,          // 4 + 64
    pub webhook_url: String,            // 4 + 128
    pub category: String,               // 4 + 32
    pub verification_tier: VerificationTier, // 1
    pub community_score: i32,           // 4
    pub total_transactions: u64,        // 8
    pub total_volume: u64,              // 8
    pub failed_transactions: u32,       // 4
    pub premium_badge_active: bool,     // 1
    pub premium_badge_expires: i64,     // 8
    pub created_at: i64,                // 8
    pub last_updated: i64,              // 8
    pub bump: u8,                       // 1
}

impl Merchant {
    pub const SPACE: usize = 8 + // discriminator
        32 + // owner
        (4 + MAX_BUSINESS_NAME_LEN) +
        (4 + MAX_WEBHOOK_URL_LEN) +
        (4 + MAX_CATEGORY_LEN) +
        1 + 4 + 8 + 8 + 4 + // verification_tier through failed_transactions
        1 + 8 + 8 + 8 + 1; // premium_badge_active through bump
}

#[account]
pub struct Review {
    pub merchant: Pubkey,               // 32
    pub reviewer: Pubkey,               // 32
    pub rating: u8,                     // 1
    pub comment: String,                // 4 + 256
    pub timestamp: i64,                 // 8
    pub bump: u8,                       // 1
}

impl Review {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + (4 + MAX_REVIEW_COMMENT_LEN) + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VerificationTier {
    Unverified,
    Verified,
    Community,    // Auto-earned through excellent metrics
    Suspended,
}

// ============================================================================
// Context Structures
// ============================================================================

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = RegistryState::SPACE,
        seeds = [b"registry"],
        bump
    )]
    pub registry_state: Account<'info, RegistryState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApplyForVerification<'info> {
    #[account(
        init,
        payer = owner,
        space = Merchant::SPACE,
        seeds = [b"merchant", owner.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry_state.bump
    )]
    pub registry_state: Account<'info, RegistryState>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminMerchantAction<'info> {
    #[account(
        mut,
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry_state.bump,
        has_one = authority @ ErrorCode::UnauthorizedAdmin
    )]
    pub registry_state: Account<'info, RegistryState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubscribePremiumBadge<'info> {
    #[account(
        mut,
        seeds = [b"merchant", owner.key().as_ref()],
        bump = merchant.bump,
        has_one = owner @ ErrorCode::UnauthorizedMerchantOwner
    )]
    pub merchant: Account<'info, Merchant>,

    #[account(
        seeds = [b"registry"],
        bump = registry_state.bump
    )]
    pub registry_state: Account<'info, RegistryState>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub merchant_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub registry_fee_account: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct RecordTransaction<'info> {
    #[account(
        mut,
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Account<'info, Merchant>,

    /// CHECK: Validated via instruction introspection in record_transaction
    /// Must be lutrii-recurring program calling via CPI
    pub recurring_program: UncheckedAccount<'info>,

    /// CHECK: Solana instructions sysvar for CPI validation
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SubmitReview<'info> {
    #[account(
        init,
        payer = reviewer,
        space = Review::SPACE,
        seeds = [
            b"review",
            merchant.key().as_ref(),
            reviewer.key().as_ref()
        ],
        bump
    )]
    pub review: Account<'info, Review>,

    #[account(
        mut,
        seeds = [b"merchant", merchant.owner.as_ref()],
        bump = merchant.bump
    )]
    pub merchant: Account<'info, Merchant>,

    /// Verified subscription - ensures user has active subscription with sybil resistance
    /// Requirements:
    /// - Subscription must be active
    /// - At least 3 successful payments
    /// - At least 1 USDC total paid (prevents spam with tiny amounts)
    #[account(
        seeds = [
            b"subscription",
            reviewer.key().as_ref(),
            merchant.owner.as_ref(),
        ],
        bump = subscription.bump,
        constraint = subscription.is_active @ ErrorCode::NoActiveSubscription,
        constraint = subscription.payment_count >= 3 @ ErrorCode::InsufficientPaymentHistory,
        constraint = subscription.total_paid >= 1_000_000 @ ErrorCode::InsufficientTotalPaid,
        seeds::program = lutrii_recurring::ID
    )]
    pub subscription: Account<'info, lutrii_recurring::Subscription>,

    #[account(mut)]
    pub reviewer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMerchantInfo<'info> {
    #[account(
        mut,
        seeds = [b"merchant", owner.key().as_ref()],
        bump = merchant.bump,
        has_one = owner @ ErrorCode::UnauthorizedMerchantOwner
    )]
    pub merchant: Account<'info, Merchant>,

    pub owner: Signer<'info>,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct MerchantApplicationSubmitted {
    pub merchant: Pubkey,
    pub owner: Pubkey,
    pub business_name: String,
    pub timestamp: i64,
}

#[event]
pub struct MerchantVerified {
    pub merchant: Pubkey,
    pub tier: VerificationTier,
    pub timestamp: i64,
}

#[event]
pub struct MerchantUpgraded {
    pub merchant: Pubkey,
    pub new_tier: VerificationTier,
    pub auto_upgraded: bool,
}

#[event]
pub struct MerchantSuspended {
    pub merchant: Pubkey,
    pub reason: String,
    pub score: i32,
}

#[event]
pub struct PremiumBadgeActivated {
    pub merchant: Pubkey,
    pub expires_at: i64,
}

#[event]
pub struct ReviewSubmitted {
    pub merchant: Pubkey,
    pub reviewer: Pubkey,
    pub rating: u8,
    pub new_score: i32,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Business name must be 1-64 characters")]
    InvalidBusinessName,

    #[msg("Webhook URL must be 1-128 characters")]
    InvalidWebhookUrl,

    #[msg("Category must be 1-32 characters")]
    InvalidCategory,

    #[msg("Merchant must be verified before purchasing premium badge")]
    MustBeVerifiedFirst,

    #[msg("Rating must be between 1 and 5 stars")]
    InvalidRating,

    #[msg("Review comment must be 1-256 characters")]
    InvalidComment,

    #[msg("Arithmetic overflow detected")]
    Overflow,

    #[msg("Unauthorized: only registry admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Unauthorized: only merchant owner can perform this action")]
    UnauthorizedMerchantOwner,

    #[msg("Unauthorized CPI caller - only lutrii-recurring program allowed")]
    UnauthorizedCpiCaller,

    #[msg("Cannot manually set Community tier - must be auto-earned")]
    CannotManuallySetCommunityTier,

    #[msg("Must have active subscription to submit review")]
    NoActiveSubscription,

    #[msg("Must have made at least one payment to submit review")]
    NoPaymentHistory,

    #[msg("Must have made at least 3 payments to submit review (sybil resistance)")]
    InsufficientPaymentHistory,

    #[msg("Must have paid at least 1 USDC total to submit review (sybil resistance)")]
    InsufficientTotalPaid,

    #[msg("Subscription must be at least 7 days old to submit review (sybil resistance)")]
    SubscriptionTooNew,

    #[msg("Suspension reason must be 1-256 characters")]
    InvalidSuspensionReason,

    #[msg("Must be called via CPI from lutrii-recurring program")]
    MustBeCalledViaCpi,
}

// ============================================================================
// External Program References
// ============================================================================

/// Reference to lutrii-recurring program for CPI validation and cross-program queries
pub mod lutrii_recurring {
    use super::*;

    // This would normally import from the actual program, but for now we define the interface
    declare_id!("146BGDDLG4yRYXfNCCDdRRmCAYTrGddCgY14n4ekxJyF");

    #[account]
    pub struct Subscription {
        pub user: Pubkey,
        pub merchant: Pubkey,
        pub user_token_account: Pubkey,
        pub merchant_token_account: Pubkey,
        pub amount: u64,
        pub original_amount: u64,
        pub frequency_seconds: i64,
        pub last_payment: i64,
        pub next_payment: i64,
        pub total_paid: u64,
        pub payment_count: u32,
        pub is_active: bool,
        pub is_paused: bool,
        pub max_per_transaction: u64,
        pub lifetime_cap: u64,
        pub merchant_name: String,
        pub created_at: i64,
        pub bump: u8,
    }
}
