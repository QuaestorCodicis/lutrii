use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // ========================================================================
    // System Errors
    // ========================================================================
    #[msg("System is currently paused for emergency maintenance")]
    SystemPaused,

    #[msg("Payment already in progress - reentrancy protection")]
    PaymentInProgress,

    #[msg("Arithmetic overflow detected")]
    Overflow,

    // ========================================================================
    // Subscription Errors
    // ========================================================================
    #[msg("Subscription is inactive and cannot be modified")]
    SubscriptionInactive,

    #[msg("Subscription is currently paused")]
    SubscriptionPaused,

    #[msg("Payment is not yet due - too early to execute")]
    PaymentNotDue,

    #[msg("Subscription is already paused")]
    AlreadyPaused,

    #[msg("Subscription is not paused")]
    NotPaused,

    #[msg("Subscription must be inactive before closing")]
    SubscriptionStillActive,

    // ========================================================================
    // Spending Limits and Safety Errors
    // ========================================================================
    #[msg("Amount exceeds per-transaction safety cap")]
    ExceedsTransactionCap,

    #[msg("Total paid would exceed lifetime safety cap")]
    ExceedsLifetimeCap,

    #[msg("Daily volume limit exceeded - try again tomorrow")]
    VelocityExceeded,

    #[msg("Price changed more than 10% from original - safety check failed")]
    PriceVarianceExceeded,

    // ========================================================================
    // Payment Errors
    // ========================================================================
    #[msg("Insufficient amount to cover platform fee")]
    InsufficientAmount,

    #[msg("Fee must be at least 0.01% (1 basis point)")]
    FeeTooLow,

    #[msg("Fee cannot exceed 5% (500 basis points)")]
    FeeTooHigh,

    // ========================================================================
    // Validation Errors
    // ========================================================================
    #[msg("Frequency must be at least 1 hour (3600 seconds)")]
    FrequencyTooShort,

    #[msg("Frequency cannot exceed 1 year (31536000 seconds)")]
    FrequencyTooLong,

    #[msg("Merchant name must be 1-32 characters")]
    InvalidMerchantName,

    #[msg("Amount must be greater than 0")]
    AmountTooLow,

    #[msg("Token account owner does not match expected owner")]
    InvalidTokenAccountOwner,

    #[msg("Token account mint does not match expected mint")]
    InvalidMint,

    #[msg("Invalid token account provided")]
    InvalidTokenAccount,

    // ========================================================================
    // Merchant Errors
    // ========================================================================
    #[msg("Merchant must be verified to accept subscriptions")]
    MerchantNotVerified,

    #[msg("Merchant is suspended and cannot accept new subscriptions")]
    MerchantSuspended,

    #[msg("Invalid merchant account - PDA validation failed")]
    InvalidMerchantAccount,

    // ========================================================================
    // Authorization Errors
    // ========================================================================
    #[msg("Unauthorized: only subscription owner can perform this action")]
    UnauthorizedUser,

    #[msg("Unauthorized: only platform admin can perform this action")]
    UnauthorizedAdmin,

    // ========================================================================
    // Platform Config Errors (Phase 1)
    // ========================================================================
    #[msg("Invalid fee wallet mint - must be USDC or USD1 token account")]
    InvalidFeeWalletMint,

    #[msg("No update provided - must specify at least one field to update")]
    NoUpdateProvided,

    #[msg("Platform config not initialized")]
    ConfigNotInitialized,

    // ========================================================================
    // Multi-Token Errors (Phase 1)
    // ========================================================================
    #[msg("Payment token not accepted by merchant")]
    TokenNotAccepted,

    #[msg("Settlement token must be USDC or USD1")]
    InvalidSettlementToken,

    #[msg("Cannot accept more than 4 tokens")]
    TooManyAcceptedTokens,

    #[msg("Settlement token must be in accepted tokens list")]
    SettlementNotInAcceptedList,

    // ========================================================================
    // Swap Errors (Phase 1)
    // ========================================================================
    #[msg("Jupiter swap failed - slippage exceeded or route unavailable")]
    SwapFailed,

    #[msg("Slippage exceeded - received amount below minimum")]
    SlippageExceeded,

    #[msg("Invalid Jupiter program provided")]
    InvalidJupiterProgram,

    #[msg("Swap route not found for token pair")]
    SwapRouteNotFound,
}
