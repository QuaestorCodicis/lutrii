# Phase 1: Multi-Token Payments (Simplified Fee Collection)

**Last Updated:** 2026-02-11
**Status:** READY TO BUILD
**Timeline:** 10-11 weeks
**Budget:** $43k-67k

---

## What Changed from Original Plan

### ✅ Simplified

**Fee Collection:**
- ~~60/30/10 split~~ → **Single wallet** (all fees)
- ~~On-chain splitting~~ → **Manual allocation**
- ~~Multiple fee wallets~~ → **2 wallets** (USDC + USD1)

**Benefits:**
- Simpler smart contract (less complexity)
- More flexible capital allocation
- Lower gas costs (no splitting logic)
- Faster development (40 hours saved)

---

## Architecture Overview

### Payment Flow (Simplified)

```
User Wallet                     Merchant Wallet
   ($SOL)                          ($USDC)
     │                                │
     ▼                                │
┌─────────────┐                      │
│ 1. Swap     │                      │
│ SOL → USDC  │                      │
│ (Jupiter)   │                      │
└──────┬──────┘                      │
       │                              │
       ▼                              │
┌─────────────┐                      │
│ 2. Split    │                      │
│ USDC into:  │                      │
│ - Fee       │                      │
│ - Merchant  │                      │
└──┬────┬─────┘                      │
   │    │                            │
   │    └────────────────────────────┘
   │                              (Merchant gets $50)
   ▼
Platform Fee Wallet
($2.50 in USDC)
```

### Key Design Points

1. **Fees ALWAYS in stablecoins** ($USDC or $USD1)
2. **Extracted AFTER swap** (from swapped amount)
3. **Single destination wallet** per stablecoin
4. **Manual allocation later** (you control)

---

## Smart Contract Updates

### New: `PlatformConfig` Account

```rust
// programs/lutrii-recurring/src/state/platform_config.rs

use anchor_lang::prelude::*;

#[account]
pub struct PlatformConfig {
    /// Admin authority (can update config)
    pub authority: Pubkey,

    /// Fee wallet for USDC fees
    pub fee_wallet_usdc: Pubkey,

    /// Fee wallet for USD1 fees (optional)
    pub fee_wallet_usd1: Pubkey,

    /// PDA bump
    pub bump: u8,

    // Reserved for Phase 3 upgrade
    pub reserved1: Pubkey,              // operations_wallet (Phase 3)
    pub reserved2: Pubkey,              // lp_provision_wallet (Phase 3)
    pub reserved3: Pubkey,              // marketing_wallet (Phase 3)
    pub reserved4: u8,                  // split_enabled flag (Phase 3)
    pub reserved5: [u8; 63],            // Padding for future use
}

impl PlatformConfig {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 32 + 32 + 32 + 1 + 63;

    pub fn get_fee_wallet(&self, settlement_token: &Pubkey) -> Pubkey {
        if *settlement_token == USDC_MINT {
            self.fee_wallet_usdc
        } else if *settlement_token == USD1_MINT {
            self.fee_wallet_usd1
        } else {
            panic!("Unsupported settlement token for fees");
        }
    }
}
```

### Initialize Config Instruction

```rust
// programs/lutrii-recurring/src/instructions/initialize_config.rs

use anchor_lang::prelude::*;
use crate::state::PlatformConfig;

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

    /// Fee wallet for USDC (must be token account)
    /// CHECK: Validated as USDC token account
    pub fee_wallet_usdc: AccountInfo<'info>,

    /// Fee wallet for USD1 (must be token account)
    /// CHECK: Validated as USD1 token account
    pub fee_wallet_usd1: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
    let config = &mut ctx.accounts.config;

    config.authority = ctx.accounts.authority.key();
    config.fee_wallet_usdc = ctx.accounts.fee_wallet_usdc.key();
    config.fee_wallet_usd1 = ctx.accounts.fee_wallet_usd1.key();
    config.bump = ctx.bumps.config;

    // Initialize reserved fields to default (Pubkey::default())
    config.reserved1 = Pubkey::default();
    config.reserved2 = Pubkey::default();
    config.reserved3 = Pubkey::default();
    config.reserved4 = 0;
    config.reserved5 = [0; 63];

    msg!("Platform config initialized");
    msg!("USDC fee wallet: {}", config.fee_wallet_usdc);
    msg!("USD1 fee wallet: {}", config.fee_wallet_usd1);

    Ok(())
}
```

### Updated: `execute_payment` with Fee Collection

```rust
// programs/lutrii-recurring/src/instructions/execute_payment.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Subscription, PlatformConfig};
use crate::utils::{calculate_platform_fee, execute_jupiter_swap};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    #[account(
        mut,
        has_one = subscriber,
        seeds = [b"subscription", subscriber.key().as_ref(), merchant_owner.key().as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// CHECK: Merchant owner for PDA
    pub merchant_owner: AccountInfo<'info>,

    /// Merchant account (to validate tier)
    /// CHECK: Deserialized and validated in handler
    pub merchant_account: AccountInfo<'info>,

    /// Platform config (for fee wallet)
    #[account(
        seeds = [b"platform_config"],
        bump = config.bump
    )]
    pub config: Account<'info, PlatformConfig>,

    // Payment token accounts (user's wallet)
    #[account(mut)]
    pub user_payment_token_account: Account<'info, TokenAccount>,

    // Settlement token accounts (for swap if needed)
    #[account(mut)]
    pub temp_settlement_token_account: Account<'info, TokenAccount>,

    // Fee destination (USDC or USD1)
    #[account(
        mut,
        constraint = platform_fee_wallet.key() == config.get_fee_wallet(&settlement_token_mint.key())
    )]
    pub platform_fee_wallet: Account<'info, TokenAccount>,

    // Merchant's settlement token account
    /// CHECK: Validated against merchant data
    #[account(mut)]
    pub merchant_settlement_account: AccountInfo<'info>,

    /// Settlement token mint (USDC or USD1)
    /// CHECK: Validated in handler
    pub settlement_token_mint: AccountInfo<'info>,

    // Jupiter (if swap needed)
    /// CHECK: Jupiter program
    pub jupiter_program: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;
    let clock = &ctx.accounts.clock;

    // Load merchant data
    let merchant_data = load_merchant_account(&ctx.accounts.merchant_account)?;

    // CHECKS
    require!(!subscription.payment_in_progress, ErrorCode::PaymentInProgress);
    require!(subscription.is_active, ErrorCode::SubscriptionNotActive);
    require!(
        clock.unix_timestamp >= subscription.next_payment,
        ErrorCode::PaymentNotDue
    );

    // EFFECTS - Set reentrancy guard
    let subscription = &mut ctx.accounts.subscription;
    subscription.payment_in_progress = true;

    // Calculate amounts
    let subscription_amount = subscription.amount;
    let platform_fee = calculate_platform_fee(
        subscription_amount,
        merchant_data.verification_tier,
    )?;
    let total_needed = subscription_amount.checked_add(platform_fee).unwrap();

    // Check if swap needed
    let needs_swap = subscription.payment_token != merchant_data.settlement_token;

    // INTERACTIONS

    if needs_swap {
        // Execute swap: user's token → merchant's settlement token
        let swapped_amount = execute_jupiter_swap(
            &ctx.accounts.jupiter_program,
            &ctx.accounts.user_payment_token_account,
            &ctx.accounts.temp_settlement_token_account,
            &subscription.payment_token,
            &merchant_data.settlement_token,
            total_needed,
            ctx.remaining_accounts,
        )?;

        // Verify swap gave us enough
        require!(
            swapped_amount >= total_needed,
            ErrorCode::SlippageExceeded
        );

        // Track swap rate
        let swap_rate = (swapped_amount as u128 * 1_000_000_000) / total_needed as u128;
        subscription.last_swap_rate = swap_rate as u64;

        // Transfer platform fee (from swapped tokens)
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.temp_settlement_token_account.to_account_info(),
                    to: ctx.accounts.platform_fee_wallet.to_account_info(),
                    authority: ctx.accounts.temp_settlement_token_account.to_account_info(),
                },
                &[&[
                    b"temp_settlement",
                    subscription.key().as_ref(),
                    &[ctx.bumps.temp_settlement_token_account],
                ]],
            ),
            platform_fee,
        )?;

        // Transfer to merchant (remaining amount)
        let merchant_amount = swapped_amount.checked_sub(platform_fee).unwrap();
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.temp_settlement_token_account.to_account_info(),
                    to: ctx.accounts.merchant_settlement_account.to_account_info(),
                    authority: ctx.accounts.temp_settlement_token_account.to_account_info(),
                },
                &[&[
                    b"temp_settlement",
                    subscription.key().as_ref(),
                    &[ctx.bumps.temp_settlement_token_account],
                ]],
            ),
            merchant_amount,
        )?;

    } else {
        // No swap - direct transfer (already in stablecoin)

        // Transfer platform fee
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_payment_token_account.to_account_info(),
                    to: ctx.accounts.platform_fee_wallet.to_account_info(),
                    authority: subscription.to_account_info(),
                },
                &[&[
                    b"subscription",
                    subscription.subscriber.as_ref(),
                    subscription.merchant_owner.as_ref(),
                    &[subscription.bump],
                ]],
            ),
            platform_fee,
        )?;

        // Transfer to merchant
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_payment_token_account.to_account_info(),
                    to: ctx.accounts.merchant_settlement_account.to_account_info(),
                    authority: subscription.to_account_info(),
                },
                &[&[
                    b"subscription",
                    subscription.subscriber.as_ref(),
                    subscription.merchant_owner.as_ref(),
                    &[subscription.bump],
                ]],
            ),
            subscription_amount,
        )?;
    }

    // Update subscription state
    subscription.last_payment = clock.unix_timestamp;
    subscription.next_payment = calculate_next_payment(
        subscription.next_payment,
        subscription.interval,
    );
    subscription.payment_count += 1;
    subscription.total_paid = subscription.total_paid
        .checked_add(subscription_amount)
        .unwrap();

    // Clear reentrancy guard
    subscription.payment_in_progress = false;

    emit!(PaymentExecuted {
        subscription: subscription.key(),
        amount: subscription_amount,
        platform_fee,
        merchant_received: if needs_swap {
            total_needed.checked_sub(platform_fee).unwrap()
        } else {
            subscription_amount
        },
        swap_executed: needs_swap,
        swap_rate: subscription.last_swap_rate,
        fee_token: if merchant_data.settlement_token == USDC_MINT {
            "USDC"
        } else {
            "USD1"
        },
    });

    Ok(())
}
```

**Key changes:**
- ✅ Single fee wallet (from `PlatformConfig`)
- ✅ Fee extracted in settlement token (always stablecoin)
- ✅ No splitting logic (simple transfer)
- ✅ Reserved fields for Phase 3 upgrade

---

## Development Timeline (Updated)

### Week 1-2: Platform Config + Merchant Tokens

**Tasks:**

1. **Create `PlatformConfig` account** (8 hours)
   - State struct
   - Initialize instruction
   - Update instruction (for changing fee wallets)
   - Tests

2. **Update `MerchantAccount`** (16 hours)
   - Add settlement_token field
   - Add accepted_tokens array
   - Create update_merchant_tokens instruction
   - Validation logic
   - Tests

3. **Generate fee wallets** (4 hours)
   - Create 2 new keypairs
   - Create USDC token account
   - Create USD1 token account
   - Test initialization

4. **Deploy to devnet** (4 hours)
   - Build and deploy programs
   - Initialize platform config
   - Test merchant token updates

**Deliverables:**
- ✅ Platform config working
- ✅ Fee wallets set up
- ✅ Merchants can configure tokens
- ✅ 15+ tests passing

**Estimated Effort:** 32 hours (saved 8 hours vs original plan)

---

### Week 3-4: Multi-Token Subscriptions

**Tasks:**

1. **Update `Subscription` struct** (8 hours)
   - Add payment_token field
   - Add swap tracking fields
   - Migration for existing subs

2. **Update `create_subscription`** (12 hours)
   - Accept payment_token parameter
   - Validate token accepted by merchant
   - Initialize with payment token
   - Tests

3. **Update delegation logic** (8 hours)
   - Handle different token types
   - Correct decimals handling
   - Tests

4. **Integration tests** (8 hours)
   - Create sub with each token
   - Validate rejections
   - Edge cases

**Deliverables:**
- ✅ Subscriptions support payment token
- ✅ Validation working
- ✅ 12+ tests passing

**Estimated Effort:** 36 hours (no change)

---

### Week 5-6: Jupiter + Fee Collection

**Tasks:**

1. **Jupiter swap integration** (40 hours)
   - CPI to Jupiter
   - Slippage protection
   - Error handling
   - Route optimization

2. **Update `execute_payment`** (24 hours)
   - Add swap logic
   - Fee extraction AFTER swap
   - Single fee wallet transfer
   - Tests for all paths

3. **Fee collection tests** (12 hours)
   - Verify fees in USDC wallet
   - Verify fees in USD1 wallet
   - Test swap + fee
   - Test direct + fee

**Deliverables:**
- ✅ Swaps working via Jupiter
- ✅ Fees collected in stablecoins
- ✅ 20+ tests passing

**Estimated Effort:** 76 hours (saved 4 hours vs original - no split logic)

**Total time saved:** 12 hours

---

## Testing Plan

### Unit Tests (Target: 50+)

**Platform Config (5 tests):**
- ✅ Initialize with valid wallets
- ✅ Update fee wallets (admin only)
- ✅ Reject unauthorized updates
- ✅ Get correct fee wallet for USDC
- ✅ Get correct fee wallet for USD1

**Merchant Tokens (8 tests):**
- ✅ Set settlement token
- ✅ Add accepted tokens
- ✅ Reject unsupported tokens
- ✅ Reject >4 accepted tokens
- ✅ Update tokens
- ✅ Validate accepted tokens
- ✅ Only owner can update
- ✅ Settlement must be in accepted list

**Subscription Creation (10 tests):**
- ✅ Create with each token (SOL, USDC, USD1, SKR)
- ✅ Reject token not accepted
- ✅ Store payment token correctly
- ✅ Delegate correct amount
- ✅ Initialize swap fields to 0

**Payment Execution (27 tests):**
- ✅ Direct payment (USDC → USDC)
- ✅ Direct payment (USD1 → USD1)
- ✅ Swap payment (SOL → USDC)
- ✅ Swap payment (SKR → USDC)
- ✅ Swap payment (USD1 → USDC)
- ✅ Fee extracted correctly (all cases)
- ✅ Fee sent to correct wallet
- ✅ Merchant receives correct amount
- ✅ Slippage protection works
- ✅ Swap rate tracked
- ✅ Reentrancy guard works
- ✅ ... (16 more edge cases)

---

## Deployment Steps

### 1. Generate Fee Wallets (One-time)

```bash
# Create USDC fee wallet
solana-keygen new --outfile ~/.config/solana/lutrii-fee-usdc.json

# Create USD1 fee wallet
solana-keygen new --outfile ~/.config/solana/lutrii-fee-usd1.json

# Get addresses
USDC_FEE_WALLET=$(solana-keygen pubkey ~/.config/solana/lutrii-fee-usdc.json)
USD1_FEE_WALLET=$(solana-keygen pubkey ~/.config/solana/lutrii-fee-usd1.json)

# Fund with rent (0.1 SOL each)
solana transfer $USDC_FEE_WALLET 0.1
solana transfer $USD1_FEE_WALLET 0.1

# Create token accounts
spl-token create-account EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v --owner $USDC_FEE_WALLET
spl-token create-account [USD1_MINT] --owner $USD1_FEE_WALLET
```

### 2. Deploy Programs (Devnet)

```bash
# Build programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program IDs
RECURRING_PROGRAM=$(solana address -k target/deploy/lutrii_recurring-keypair.json)
REGISTRY_PROGRAM=$(solana address -k target/deploy/lutrii_merchant_registry-keypair.json)

echo "Recurring: $RECURRING_PROGRAM"
echo "Registry: $REGISTRY_PROGRAM"
```

### 3. Initialize Platform Config

```bash
# Run initialization script
ts-node scripts/initialize-platform-config.ts \
  --program $RECURRING_PROGRAM \
  --usdc-wallet $USDC_FEE_WALLET \
  --usd1-wallet $USD1_FEE_WALLET
```

**Script:**
```typescript
// scripts/initialize-platform-config.ts
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = /* load program */;

  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    program.programId
  );

  await program.methods
    .initializeConfig()
    .accounts({
      config: configPDA,
      authority: provider.wallet.publicKey,
      feeWalletUsdc: new PublicKey(process.argv[4]),
      feeWalletUsd1: new PublicKey(process.argv[6]),
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("Platform config initialized:", configPDA.toString());
}

main();
```

### 4. Verify Setup

```bash
# Check config account
anchor account platformConfig <CONFIG_PDA>

# Should show:
# authority: <your wallet>
# feeWalletUsdc: <USDC fee wallet>
# feeWalletUsd1: <USD1 fee wallet>
```

---

## Cost Breakdown (Updated)

| Item | Original | Simplified | Savings |
|------|---------|-----------|---------|
| Smart contract dev | $30k-45k | $28k-42k | **$2k-3k** |
| Jupiter integration | $5k-10k | $5k-10k | $0 |
| Frontend dev | $8k-12k | $8k-12k | $0 |
| Security review | $5k | $5k | $0 |
| **Total** | **$48k-72k** | **$46k-69k** | **$2k-3k** |

**Time savings:** ~12 hours (less splitting logic, simpler tests)

**Complexity reduction:** Significant (no on-chain math for splits)

---

## Summary

**What we're building:**
- Multi-token payments (SOL, USDC, USD1, SKR)
- Jupiter integration for swaps
- **Simple fee collection** → Single wallet per stablecoin
- Reserved fields for Phase 3 upgrade

**What we're NOT building (yet):**
- Fee splitting (60/30/10)
- $LUTRII token/burns
- Multi-sig wallets

**Benefits of simplified approach:**
- Faster development
- Lower costs
- More flexibility
- Easier to test
- Same upgrade path

**Ready to start:** Week 1-2 (Platform Config + Merchant Tokens)

---

**Created:** 2026-02-11
**Status:** READY TO BUILD
**Next Action:** Generate fee wallets and begin smart contract updates

