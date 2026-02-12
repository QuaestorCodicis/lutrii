# Lutrii Fee Collection & Capital Allocation Strategy

**Last Updated:** 2026-02-11
**Status:** PHASE 1 IMPLEMENTATION
**Philosophy:** Simple now, strategic later

---

## Overview

**Phase 1 Strategy (Now - First 12 months):**
- Collect ALL fees in single wallet
- Convert ALL fees to stablecoins ($USDC or $USD1)
- Manually allocate to growth initiatives
- Build capital base before token launch

**Phase 3 Strategy (After $LUTRII launch):**
- Activate automated fee splitting
- Allocate to LP provision, treasury, operations
- Strategic acquisition of $SOL and $SKR

---

## Phase 1: Fee Collection (Simple)

### Single Fee Wallet

```
All Platform Fees → Single USDC Wallet
                     ↓
              Manual Allocation
                     ↓
    ┌────────────────┼────────────────┐
    ↓                ↓                ↓
Operations    Growth/Marketing   Capital Reserve
```

**Why this is better:**
✅ **Simpler smart contract** - No on-chain splitting logic
✅ **Flexibility** - Reallocate based on needs
✅ **Stablecoin revenue** - Predictable, no volatility
✅ **Bootstrap faster** - All capital available for growth
✅ **Audit trail** - Manual transfers = clear accounting

### Fee Conversion Logic

**Rule:** Platform fees ALWAYS collected in stablecoins ($USDC or $USD1)

**User pays in stablecoin:**
```
User: $USDC or $USD1
↓
Merchant gets: Subscription amount (in settlement token)
Platform gets: Fee (in same stablecoin)
```
**No conversion needed** - Direct fee deduction

**User pays in volatile token (SOL, SKR):**
```
User: $SOL
↓ (Jupiter swap)
Merchant gets: $USDC (settlement token)
Platform gets: Fee in $USDC (from swapped amount)
```
**Fee extracted AFTER swap** - Always in stablecoins

### Smart Contract Implementation

```rust
// Phase 1: Simple fee collection

pub struct PlatformConfig {
    pub authority: Pubkey,              // Admin (you)
    pub fee_wallet_usdc: Pubkey,        // Single USDC fee wallet
    pub fee_wallet_usd1: Pubkey,        // Single USD1 fee wallet (optional)
    pub bump: u8,
}

pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;
    let merchant_data = load_merchant_data(ctx.accounts.merchant_account)?;

    // Calculate platform fee
    let platform_fee = calculate_platform_fee(
        subscription.amount,
        merchant_data.verification_tier,
    )?;

    // Check if swap needed
    let needs_swap = subscription.payment_token != merchant_data.settlement_token;

    if needs_swap {
        // 1. Swap user's tokens to merchant's settlement token
        let total_needed = subscription.amount.checked_add(platform_fee).unwrap();
        let swapped_amount = execute_jupiter_swap(
            &ctx.accounts.jupiter_program,
            &ctx.accounts.user_payment_token,
            &ctx.accounts.temp_settlement_token,
            total_needed,
            /* ... */
        )?;

        // 2. Extract platform fee (in settlement token, which is stablecoin)
        transfer_fee_to_platform(
            &ctx.accounts.temp_settlement_token,
            &ctx.accounts.platform_fee_wallet, // USDC or USD1 wallet
            platform_fee,
            /* ... */
        )?;

        // 3. Send remaining to merchant
        let merchant_amount = swapped_amount.checked_sub(platform_fee).unwrap();
        transfer_to_merchant(
            &ctx.accounts.temp_settlement_token,
            &merchant_data.settlement_token_account,
            merchant_amount,
            /* ... */
        )?;
    } else {
        // No swap - direct transfer (already in stablecoin)

        // 1. Extract platform fee
        transfer_fee_to_platform(
            &ctx.accounts.user_payment_token,
            &ctx.accounts.platform_fee_wallet,
            platform_fee,
            /* ... */
        )?;

        // 2. Send subscription amount to merchant
        transfer_to_merchant(
            &ctx.accounts.user_payment_token,
            &merchant_data.settlement_token_account,
            subscription.amount,
            /* ... */
        )?;
    }

    emit!(PaymentExecuted {
        subscription: subscription.key(),
        amount: subscription.amount,
        platform_fee,
        fee_token: if merchant_data.settlement_token == USDC_MINT {
            "USDC"
        } else {
            "USD1"
        },
    });

    Ok(())
}
```

**Key insight:** Since merchants default to $USDC settlement, and we collect fees in settlement token, we automatically get stablecoin fees without extra conversion.

---

## Phase 1: Capital Allocation (Manual)

### Revenue Projections

**Assumptions:**
- 1,000 active subscriptions (6 months)
- Average subscription: $20/month
- Average fee tier: 2.0%
- Platform fee per subscription: $0.40/month

**Monthly Revenue:**
- 1,000 subs × $0.40 = **$400/month**
- **$4,800/year**

**At Scale (10k subscriptions, 12 months):**
- 10,000 subs × $0.40 = **$4,000/month**
- **$48,000/year**

### Allocation Strategy (Phase 1)

| Category | Allocation | Purpose | Examples |
|----------|-----------|---------|----------|
| **Operations** | 50% | Keep lights on | Servers, RPC, infrastructure |
| **Growth** | 30% | User acquisition | Marketing, partnerships, bounties |
| **Reserve** | 20% | Build capital | Save for token launch, audits |

**Example at $4,000/month:**
- Operations: $2,000/month
- Growth: $1,200/month
- Reserve: $800/month ($9,600/year saved)

**After 12 months:**
- Revenue: $48,000
- Reserve built: $9,600
- Use reserve for: Token launch ($10k-15k) ✅

---

## Phase 3: Automated Fee Splitting (After Token Launch)

### When to Activate

**Criteria:**
- ✅ $LUTRII token launched
- ✅ LP pools established
- ✅ 10,000+ active subscriptions
- ✅ $50k+ annual revenue

### Automated Split (60/30/10)

```
Platform Fee ($1.00)
├── 60% → Operations Wallet ($0.60)
│   └─ Immediate payment for servers, salaries, infrastructure
│
├── 30% → LP Provision ($0.30)
│   └─ Automatically adds to $LUTRII/$USDC liquidity pool
│
└── 10% → Marketing/Growth ($0.10)
    └─ User acquisition, partnerships, grants
```

**Implementation:**
```rust
// Phase 3: Automated splitting (added via program upgrade)

pub struct FeeWallets {
    pub authority: Pubkey,
    pub operations_wallet: Pubkey,      // 60%
    pub lp_provision_wallet: Pubkey,    // 30% (multi-sig)
    pub marketing_wallet: Pubkey,       // 10%
    pub bump: u8,
}

pub fn distribute_platform_fee(
    fee_wallets: &FeeWallets,
    total_fee: u64,
    /* ... */
) -> Result<()> {
    let operations_amount = total_fee * 60 / 100;
    let lp_amount = total_fee * 30 / 100;
    let marketing_amount = total_fee - operations_amount - lp_amount;

    // Transfer to each wallet
    transfer(operations_wallet, operations_amount)?;
    transfer(lp_provision_wallet, lp_amount)?;
    transfer(marketing_wallet, marketing_amount)?;

    Ok(())
}
```

---

## Strategic Asset Acquisition

### Why Acquire $SOL and $SKR

**$SOL (Solana):**
- Network gas token - needed for operations
- Staking rewards (6-8% APY)
- Ecosystem exposure
- Long-term store of value

**$SKR (Seeker):**
- Solana Mobile ecosystem token
- Strategic partnership signal
- Early adopter advantage
- Potential appreciation

### Acquisition Strategy

**Phase 1 (Bootstrap):**
- 0% allocation - Focus on stablecoins
- Exception: Accept fees in SOL/SKR, keep small % for ops

**Phase 2 (Growth):**
- 5-10% of profits into $SOL
- 3-5% of profits into $SKR
- DCA (dollar-cost average) monthly

**Phase 3 (Mature):**
- 10-15% of profits into $SOL
- 5-10% of profits into $SKR
- Strategic reserve: 20% $USDC, 10% $SOL, 5% $SKR, 65% ops

### Acquisition Schedule (Example)

**Month 1-6 (Bootstrap):**
- Revenue: $400-1,000/month
- Acquire: 0% (all to growth)

**Month 7-12 (Growth):**
- Revenue: $2,000-4,000/month
- Reserve: $800/month
- Acquire $SOL: $40/month (5%)
- Acquire $SKR: $24/month (3%)

**Month 13+ (Mature):**
- Revenue: $5,000-10,000/month
- Reserve: $2,000/month
- Acquire $SOL: $300/month (15%)
- Acquire $SKR: $200/month (10%)
- Remainder: Operations + growth

**After 24 months:**
- Total $SOL acquired: ~$3,840 (at DCA)
- Total $SKR acquired: ~$2,304 (at DCA)
- Strategic reserve: Built for operations

---

## Treasury Management (Phase 3+)

### Multi-Sig Treasury

**Phase 3: Create multi-sig for large balances**

**Structure:**
- 3-of-5 multi-sig (Squads Protocol)
- Signers: Founder + 2 team + 2 advisors
- Threshold: 3 signatures required

**Holdings:**
- $USDC: 40% (stability)
- $LUTRII: 30% (aligned with token holders)
- $SOL: 20% (ecosystem exposure)
- $SKR: 10% (mobile ecosystem)

**Annual Rebalancing:**
- Sell gains to maintain target %
- Buy dips to maintain target %
- DCA new profits into all 4

### Use of Treasury

| Purpose | Allocation | Examples |
|---------|-----------|----------|
| Operations | 50% | Salaries, servers, infrastructure |
| Development | 25% | New features, audits, bounties |
| Marketing | 15% | User acquisition, events |
| Strategic | 10% | Partnerships, acquisitions |

---

## LP Provision Strategy (Phase 3)

### $LUTRII Liquidity Pools

**Primary Pool: $LUTRII/$USDC (80% of LP allocation)**
- Most stable pair
- Easy to measure token price
- Low impermanent loss

**Secondary Pool: $LUTRII/$SOL (20% of LP allocation)**
- More volatile
- Higher trading volume potential
- SOL ecosystem alignment

### Auto-Add Liquidity

**Trigger:** Every $10k USDC accumulated in LP provision wallet

**Process:**
1. Check LP wallet balance
2. If >= $10k USDC:
   - Buy $5k worth of $LUTRII (market buy)
   - Add $5k USDC + $5k $LUTRII to LP pool
   - Receive LP tokens
   - Lock LP tokens (cannot be withdrawn)

**Example:**
- Month 1: Collect $3k in LP wallet
- Month 2: Collect $4k (total: $7k)
- Month 3: Collect $5k (total: $12k) → Trigger
  - Buy 50,000 $LUTRII @ $0.10 = $5k
  - Add to pool: $5k USDC + 50,000 $LUTRII
  - Remaining: $2k USDC stays in wallet

---

## Fee Wallet Setup

### Phase 1: Single Wallets

**Production Wallets:**
```
Primary Fee Wallet (USDC):
Address: [Generate new wallet]
Purpose: Collect all platform fees in USDC
Access: Single-sig (you control)

Backup Fee Wallet (USD1):
Address: [Generate new wallet]
Purpose: Collect fees when merchant settles in USD1
Access: Single-sig (you control)
```

**Setup Steps:**
1. Generate 2 new Solana keypairs
2. Fund with 0.1 SOL each (for rent)
3. Create USDC token account on first wallet
4. Create USD1 token account on second wallet
5. Update program config with wallet addresses
6. Test with small transaction

### Phase 3: Multi-Sig Wallets

**Production Wallets (after token launch):**
```
Operations Wallet (USDC):
Type: Single-sig (you)
Purpose: Daily operations
Access: Hot wallet

LP Provision Wallet (USDC):
Type: 2-of-3 multi-sig
Purpose: Add liquidity
Access: You + 1 co-founder + 1 advisor

Marketing Wallet (USDC):
Type: 2-of-3 multi-sig
Purpose: Growth initiatives
Access: You + 1 marketing lead + 1 advisor
```

---

## Accounting & Reporting

### Monthly Reports (Phase 1)

**Metrics to Track:**
1. Total fees collected (USDC)
2. Number of transactions
3. Average fee per transaction
4. Fee breakdown by merchant tier
5. Fee breakdown by payment token (SOL, USDC, etc.)

**Template:**
```
Lutrii Monthly Fee Report - March 2026

Total Fees Collected: $3,247 USDC
Total Transactions: 8,118
Average Fee: $0.40

By Merchant Tier:
- Verified (2.5%): $2,156 (66%)
- Community (1.5%): $891 (27%)
- Premium (0.5%): $200 (7%)

By Payment Token:
- USDC (direct): $1,948 (60%)
- SOL (swapped): $974 (30%)
- SKR (swapped): $325 (10%)

Capital Allocation:
- Operations: $1,623 (50%)
- Growth: $974 (30%)
- Reserve: $650 (20%)

Reserve Balance: $7,800 (12 months runway)
```

### Tax Reporting

**For US Tax (example):**
- Platform fees = Business income (taxable)
- Stablecoin fees = Easy (no conversion needed)
- SOL/SKR fees = Need fair market value at time of receipt

**Recommendation:**
- Use Bitwave or Cryptio for crypto accounting
- Export monthly fee reports
- Work with crypto CPA (Gordon Law, Camuso CPA)

---

## Upgrade Path (Phase 1 → Phase 3)

### Smart Contract Upgrade

**Current (Phase 1):**
```rust
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub fee_wallet_usdc: Pubkey,        // Single wallet
    pub fee_wallet_usd1: Pubkey,        // Single wallet
    pub bump: u8,

    // Reserved for Phase 3
    pub reserved1: Pubkey,              // Will become: operations_wallet
    pub reserved2: Pubkey,              // Will become: lp_provision_wallet
    pub reserved3: Pubkey,              // Will become: marketing_wallet
    pub reserved4: u8,                  // Will become: split_enabled flag
}
```

**After Upgrade (Phase 3):**
```rust
pub struct PlatformConfig {
    pub authority: Pubkey,
    pub fee_wallet_usdc: Pubkey,        // Deprecated (kept for compatibility)
    pub fee_wallet_usd1: Pubkey,        // Deprecated
    pub bump: u8,

    // Activated in Phase 3
    pub operations_wallet: Pubkey,      // 60%
    pub lp_provision_wallet: Pubkey,    // 30%
    pub marketing_wallet: Pubkey,       // 10%
    pub split_enabled: u8,              // 1 = split active, 0 = single wallet
}
```

**Migration Steps:**
1. Deploy program upgrade
2. Initialize split wallets (operations, LP, marketing)
3. Set `split_enabled = 1`
4. First transaction after upgrade triggers split logic
5. Old wallets stop receiving fees

**Zero downtime** - Seamless transition

---

## Example: First 12 Months

### Revenue Model

| Month | Subscriptions | Monthly Fees | Cumulative |
|-------|--------------|-------------|------------|
| 1 | 100 | $40 | $40 |
| 2 | 250 | $100 | $140 |
| 3 | 500 | $200 | $340 |
| 4 | 800 | $320 | $660 |
| 5 | 1,200 | $480 | $1,140 |
| 6 | 1,800 | $720 | $1,860 |
| 7 | 2,500 | $1,000 | $2,860 |
| 8 | 3,500 | $1,400 | $4,260 |
| 9 | 5,000 | $2,000 | $6,260 |
| 10 | 7,000 | $2,800 | $9,060 |
| 11 | 9,000 | $3,600 | $12,660 |
| 12 | 10,000 | $4,000 | $16,660 |

**Year 1 Total Revenue:** $16,660

### Capital Allocation

**Operations (50%):** $8,330
- Servers: $1,200/year
- RPC: $2,400/year
- Infrastructure: $1,000/year
- Bounties/contractors: $3,730/year

**Growth (30%):** $5,000
- Marketing: $2,000
- Partnerships: $1,500
- Events/sponsorships: $1,500

**Reserve (20%):** $3,330
- Saved for: Token launch ($10k-15k)
- Need 9-15 more months to fully fund

**Asset Acquisition (Starting Month 7):**
- $SOL acquired: ~$360 (5% of $7,200)
- $SKR acquired: ~$216 (3% of $7,200)

---

## Key Decisions

### ✅ Confirmed for Phase 1

1. **Single fee wallet** (USDC + USD1)
2. **All fees in stablecoins** (no volatile tokens)
3. **Manual allocation** (50% ops, 30% growth, 20% reserve)
4. **No automated splitting** (wait for Phase 3)
5. **Strategic reserve** (save for token launch)

### ⏳ Deferred to Phase 3

1. **Automated fee splitting** (60/30/10)
2. **LP provision automation**
3. **$SOL/$SKR treasury**
4. **Multi-sig wallets**
5. **DAO governance** (future)

---

## Summary

**Phase 1 (Now):**
- Collect all fees → Single USDC wallet
- Simple, flexible, bootstrap-friendly
- Manually allocate to ops/growth/reserve
- Build capital for token launch

**Phase 3 (After $LUTRII launch):**
- Automated 60/30/10 split
- LP provision from fees
- Multi-sig treasuries
- Strategic $SOL/$SKR holdings

**This approach:**
- ✅ Keeps Phase 1 simple
- ✅ Maximizes flexibility
- ✅ Builds capital base
- ✅ Easy upgrade path
- ✅ Stablecoin-denominated = predictable

---

**Created:** 2026-02-11
**Status:** READY FOR IMPLEMENTATION
**Next Action:** Set up fee wallets and update Phase 1 smart contracts

