# Lutrii Token Economics & Multi-Token Payment Architecture

**Last Updated:** 2026-02-11
**Status:** DESIGN SPECIFICATION (Not Yet Implemented)
**Complexity:** HIGH - Requires smart contract updates, token launch, LP integration

---

## Overview

Lutrii will support **multi-token subscription payments** with automatic conversion to merchant's preferred token. This enables users to pay with any supported asset while merchants receive their preferred stablecoin.

### Supported Payment Tokens (Launch)

1. **$SOL** - Solana native token
2. **$SKR** - Seeker token (Solana Mobile ecosystem)
3. **$LUTRII** - Lutrii native token (to be launched)
4. **$USDC** - USD Coin (Circle)
5. **$USD1** - USD1 from WLFI

### Merchant Settlement (Default)

- **Default:** $USDC (most liquid, most stable)
- **Optional:** $USD1, $SOL, or other tokens merchant accepts
- **Merchant Choice:** Each merchant configures accepted tokens

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER PAYMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘

   User Wallet                                    Merchant Wallet
   ┌─────────┐                                    ┌──────────┐
   │ $SOL    │                                    │ $USDC    │
   │ $SKR    │                                    │ (default)│
   │ $LUTRII │────┐                          ┌───▶│          │
   │ $USDC   │    │                          │    └──────────┘
   │ $USD1   │    │                          │
   └─────────┘    │                          │
                  │                          │
                  ▼                          │
       ┌──────────────────────┐             │
       │  1. Check Merchant   │             │
       │  Accepted Tokens     │             │
       └──────────┬───────────┘             │
                  │                          │
                  ▼                          │
       ┌──────────────────────┐             │
       │  2. Same Token?      │─ YES ──────▶│ Direct Transfer
       └──────────┬───────────┘             │
                  │                          │
                 NO                          │
                  │                          │
                  ▼                          │
       ┌──────────────────────┐             │
       │  3. Calculate Swap   │             │
       │  (Jupiter Quote)     │             │
       └──────────┬───────────┘             │
                  │                          │
                  ▼                          │
       ┌──────────────────────┐             │
       │  4. Calculate Fees   │             │
       │  - Platform Fee      │             │
       │  - $LUTRII Discount  │             │
       └──────────┬───────────┘             │
                  │                          │
                  ▼                          │
       ┌──────────────────────┐             │
       │  5. Execute Swap     │             │
       │  (Jupiter CPI)       │             │
       └──────────┬───────────┘             │
                  │                          │
                  ▼                          │
       ┌──────────────────────┐             │
       │  6. Split Fee        │             │
       │  - 60% Dev Wallet    │             │
       │  - 30% LP Provision  │             │
       │  - 10% Marketing     │             │
       └──────────┬───────────┘             │
                  │                          │
                  ▼                          │
       ┌──────────────────────┐             │
       │  7. Pay Merchant     │─────────────┘
       │  (Converted Token)   │
       └──────────────────────┘
```

---

## Token Mint Addresses (Mainnet)

| Token | Mint Address | Decimals |
|-------|-------------|----------|
| $SOL | So11111111111111111111111111111111111111112 | 9 |
| $USDC | EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v | 6 |
| $USD1 | [To be confirmed - WLFI token] | 6 |
| $SKR | [Seeker token mint] | [TBD] |
| **$LUTRII** | **[To be created]** | **6** |

---

## Fee Structure

### Platform Fee Tiers (Based on Merchant Verification)

| Merchant Tier | Base Fee | With $LUTRII Burn Discount |
|--------------|----------|---------------------------|
| Verified | 2.5% | 2.0% (20% discount) |
| Community | 1.5% | 1.2% (20% discount) |
| Premium | 0.5% | 0.4% (20% discount) |

**Fee Caps:**
- Minimum: $0.01 USDC
- Maximum: $0.50 USDC

### Fee Distribution (After Collection)

```
Total Platform Fee = 100%
├── 60% → Dev Wallet (immediate payment)
├── 30% → $LUTRII/$USDC LP (add liquidity)
└── 10% → Marketing Wallet (operations)
```

**Example:**
- User pays $100 USDC subscription
- Merchant tier: Verified (2.5% fee)
- Platform fee: $2.50 USDC

**Distribution:**
- $1.50 → Dev wallet
- $0.75 → $LUTRII/$USDC LP pool
- $0.25 → Marketing wallet
- $97.50 → Merchant

---

## $LUTRII Token Burning Mechanism

### Discount Model

Users can burn $LUTRII tokens to receive **20% discount** on platform fees.

**Burn Rate:**
- Burn **100 $LUTRII** tokens per subscription
- Discount applies to **that specific subscription only**
- Discount valid for **90 days** from burn date

**Example:**
- Subscription: $100/month
- Base fee: 2.5% = $2.50
- User burns 100 $LUTRII
- Discounted fee: 2.0% = $2.00
- **User saves: $0.50 per month**
- **Annual savings: $6.00** (for 100 token burn)

### Burn Tracking

```rust
pub struct Subscription {
    // Existing fields...
    pub lutrii_burned: u64,           // Total $LUTRII burned for this subscription
    pub burn_discount_expires: i64,   // Unix timestamp when discount expires
    pub discounted_fee_basis_points: u16, // Adjusted fee (e.g., 200 = 2.0%)
}
```

### Deflationary Impact

**Assumptions:**
- 10,000 active subscriptions
- 50% of users burn $LUTRII for discounts
- Average 100 tokens burned per subscription

**Monthly Burn:**
- 5,000 subscriptions × 100 tokens = **500,000 $LUTRII burned/month**
- **6M $LUTRII burned/year**

**Token Supply Impact:**
- Initial supply: 100M $LUTRII
- Year 1 burn: 6M (6% of supply)
- Year 2 burn: 12M (12% of supply)
- Year 3 burn: 18M (18% of supply)

This creates deflationary pressure and increases token value over time.

---

## Token Swap Integration (Jupiter)

### Why Jupiter?

- ✅ Best prices (aggregates all Solana DEXs)
- ✅ High liquidity (routes through Orca, Raydium, etc.)
- ✅ CPI-friendly (designed for composability)
- ✅ Battle-tested (handles billions in volume)

### Swap Flow

```rust
// Pseudocode for payment execution with swap

pub fn execute_payment_with_swap(
    ctx: Context<ExecutePaymentWithSwap>,
    payment_token: Pubkey,      // User's chosen token (e.g., $SOL)
    merchant_token: Pubkey,      // Merchant's preferred token (e.g., $USDC)
    amount: u64,                 // Amount in merchant's token
) -> Result<()> {
    // 1. Check if swap needed
    let needs_swap = payment_token != merchant_token;

    // 2. Calculate total payment (subscription amount + platform fee)
    let platform_fee = calculate_fee(amount, subscription.merchant_tier);
    let total_payment = amount.checked_add(platform_fee).unwrap();

    // 3. Apply $LUTRII burn discount if applicable
    let discounted_fee = apply_lutrii_discount(platform_fee, &subscription);
    let final_total = amount.checked_add(discounted_fee).unwrap();

    if needs_swap {
        // 4. Get Jupiter quote
        let quote = get_jupiter_quote(
            payment_token,      // From token
            merchant_token,     // To token
            final_total,        // Amount to swap
        )?;

        // 5. Execute swap via CPI to Jupiter
        let swapped_amount = jupiter_swap_cpi(
            ctx.accounts.jupiter_program,
            ctx.accounts.user_token_account,
            ctx.accounts.temp_token_account,
            quote,
        )?;

        // 6. Verify swap output meets minimum
        require!(
            swapped_amount >= final_total,
            ErrorCode::SlippageExceeded
        );
    }

    // 7. Split and distribute fees
    distribute_fees(
        discounted_fee,
        ctx.accounts.dev_wallet,
        ctx.accounts.lp_pool,
        ctx.accounts.marketing_wallet,
    )?;

    // 8. Pay merchant
    transfer_to_merchant(
        amount,
        ctx.accounts.merchant_token_account,
    )?;

    // 9. Update subscription state
    subscription.last_payment = Clock::get()?.unix_timestamp;
    subscription.payment_count += 1;
    subscription.total_paid = subscription.total_paid.checked_add(amount).unwrap();

    Ok(())
}
```

### Jupiter CPI Example

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct ExecutePaymentWithSwap<'info> {
    // Existing accounts...

    // Jupiter accounts
    /// CHECK: Jupiter program
    #[account(address = jupiter_program::ID)]
    pub jupiter_program: AccountInfo<'info>,

    #[account(mut)]
    pub user_source_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub temp_destination_token: Account<'info, TokenAccount>,

    // Jupiter route accounts (dynamic, passed as remaining accounts)
    // ...
}

fn jupiter_swap_cpi(/* ... */) -> Result<u64> {
    // CPI to Jupiter aggregator
    // Returns swapped amount in destination token

    // This is a simplified example - actual implementation
    // requires passing route accounts and instruction data
    // from Jupiter quote API

    Ok(swapped_amount)
}
```

---

## Merchant Token Preferences

### Merchant Account Update

```rust
pub struct MerchantAccount {
    // Existing fields...

    /// Merchant's preferred settlement token (default: USDC)
    pub settlement_token: Pubkey,

    /// Accepted payment tokens (bitmask or vec)
    pub accepted_tokens: Vec<Pubkey>,  // e.g., [$USDC, $USD1, $SOL]

    /// Merchant's token account for settlement
    pub settlement_token_account: Pubkey,
}
```

### Merchant Configuration

Merchants configure via merchant registry:

```rust
pub fn update_merchant_tokens(
    ctx: Context<UpdateMerchantTokens>,
    settlement_token: Pubkey,           // e.g., USDC mint
    accepted_tokens: Vec<Pubkey>,       // e.g., [$USDC, $USD1, $SOL]
) -> Result<()> {
    let merchant = &mut ctx.accounts.merchant;

    // Validate settlement token is supported
    require!(
        is_supported_token(&settlement_token),
        ErrorCode::UnsupportedToken
    );

    // Validate all accepted tokens are supported
    for token in &accepted_tokens {
        require!(
            is_supported_token(token),
            ErrorCode::UnsupportedToken
        );
    }

    merchant.settlement_token = settlement_token;
    merchant.accepted_tokens = accepted_tokens;

    emit!(MerchantTokensUpdated {
        merchant: merchant.key(),
        settlement_token,
        accepted_tokens,
    });

    Ok(())
}
```

---

## $LUTRII Token Launch Plan

### Token Specifications

```
Name: Lutrii
Symbol: $LUTRII
Decimals: 6
Total Supply: 100,000,000 (100M)
Standard: SPL Token (Token-2022 with extensions)
```

### Token Distribution (100M Total)

| Allocation | Amount | Percentage | Vesting |
|-----------|--------|-----------|---------|
| Team & Founders | 20M | 20% | 2-year linear |
| Early Investors | 15M | 15% | 1-year cliff, 1-year linear |
| Community Rewards | 25M | 25% | Released via staking/rewards |
| Liquidity Provision | 20M | 20% | Locked in LP pools |
| Treasury | 15M | 15% | Controlled by DAO (future) |
| Bug Bounty & Security | 5M | 5% | On-demand, multi-sig |

### Launch Strategy

**Phase 1: Initial Liquidity (Week 1)**
- Create $LUTRII/$USDC pool on Orca or Raydium
- Add 10M $LUTRII + 100k $USDC ($0.01 initial price)
- Lock liquidity for 6 months (use LP locker)

**Phase 2: Fair Launch (Week 2-4)**
- Public sale: 10M $LUTRII at $0.015 (50% premium over LP price)
- Raise: $150k USDC
- Use proceeds: 50% to LP, 50% to treasury

**Phase 3: Incentives (Month 2+)**
- Staking rewards: 25M $LUTRII over 2 years
- Early subscriber rewards: 100 $LUTRII per new subscription (first 50k subs)
- Merchant incentives: 1000 $LUTRII per verified merchant (first 5k merchants)

---

## Liquidity Provision Automation

### LP Pool Structure

**Primary Pool:** $LUTRII/$USDC (80% of LP allocation)
**Secondary Pool:** $LUTRII/$SOL (20% of LP allocation)

### Fee Routing to LP

```rust
pub fn distribute_fees(
    total_fee: u64,
    dev_wallet: &AccountInfo,
    lp_provision: &AccountInfo,  // Multi-sig PDA
    marketing_wallet: &AccountInfo,
) -> Result<()> {
    // Split: 60% dev, 30% LP, 10% marketing
    let dev_amount = total_fee
        .checked_mul(60)
        .unwrap()
        .checked_div(100)
        .unwrap();

    let lp_amount = total_fee
        .checked_mul(30)
        .unwrap()
        .checked_div(100)
        .unwrap();

    let marketing_amount = total_fee
        .checked_mul(10)
        .unwrap()
        .checked_div(100)
        .unwrap();

    // Transfer to wallets
    transfer_checked(dev_wallet, dev_amount)?;
    transfer_checked(lp_provision, lp_amount)?;     // Accumulates here
    transfer_checked(marketing_wallet, marketing_amount)?;

    Ok(())
}
```

### LP Auto-Add Mechanism

**Option 1: Weekly Manual (Phase 1)**
- Accumulated fees stored in multi-sig PDA
- Team manually adds to LP pool weekly
- Transparent on-chain (all transactions visible)

**Option 2: Automated (Phase 2 - Future)**
- Smart contract automatically adds to LP when threshold reached
- Example: Every 10,000 USDC accumulated triggers LP add
- Uses Orca/Raydium's add liquidity instruction via CPI

```rust
// Future implementation
pub fn auto_add_liquidity(ctx: Context<AutoAddLiquidity>) -> Result<()> {
    let lp_balance = get_token_balance(&ctx.accounts.lp_provision_account)?;

    // Threshold: 10,000 USDC
    const LP_ADD_THRESHOLD: u64 = 10_000_000_000; // 10k USDC (6 decimals)

    if lp_balance >= LP_ADD_THRESHOLD {
        // Calculate 50/50 split
        let usdc_amount = lp_balance / 2;
        let lutrii_amount = calculate_lutrii_for_usdc(usdc_amount)?;

        // CPI to DEX to add liquidity
        add_liquidity_cpi(
            ctx.accounts.dex_program,
            ctx.accounts.lutrii_usdc_pool,
            usdc_amount,
            lutrii_amount,
        )?;

        emit!(LiquidityAdded {
            usdc_amount,
            lutrii_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
    }

    Ok(())
}
```

---

## Security Considerations

### Swap Security

**Risks:**
1. **Slippage attacks** - Frontrunning swap to get bad price
2. **MEV exploitation** - Sandwiching user swaps
3. **Liquidity manipulation** - Draining pools mid-swap

**Mitigations:**
```rust
// 1. Slippage protection
const MAX_SLIPPAGE_BPS: u16 = 100; // 1% max slippage

let min_output = expected_output
    .checked_mul(10000 - MAX_SLIPPAGE_BPS)
    .unwrap()
    .checked_div(10000)
    .unwrap();

require!(
    actual_output >= min_output,
    ErrorCode::SlippageExceeded
);

// 2. Oracle price validation (future)
// Compare swap price to Pyth oracle price
// Reject if deviation > 2%

// 3. Route validation
// Only allow swaps through whitelisted DEXs
const ALLOWED_DEXS: &[Pubkey] = &[
    ORCA_PROGRAM_ID,
    RAYDIUM_PROGRAM_ID,
    JUPITER_PROGRAM_ID,
];
```

### Token Burn Security

**Risks:**
1. **Double-spend** - User tries to apply same burn to multiple subs
2. **Expired discounts** - User forgets to renew, overpays
3. **Burn front-running** - Attacker burns on behalf of user

**Mitigations:**
```rust
// 1. Burn atomicity - must happen in same transaction as subscription update
pub fn burn_lutrii_for_discount(
    ctx: Context<BurnForDiscount>,
    amount: u64,
) -> Result<()> {
    // Burn tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.lutrii_mint.to_account_info(),
                from: ctx.accounts.user_lutrii_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        amount,
    )?;

    // Update subscription IMMEDIATELY (same transaction)
    let subscription = &mut ctx.accounts.subscription;
    subscription.lutrii_burned = subscription.lutrii_burned.checked_add(amount).unwrap();
    subscription.burn_discount_expires = Clock::get()?.unix_timestamp + (90 * 86400); // 90 days
    subscription.discounted_fee_basis_points = calculate_discounted_fee(subscription.merchant_tier);

    emit!(LutriiDiscountApplied {
        subscription: subscription.key(),
        amount_burned: amount,
        expires: subscription.burn_discount_expires,
    });

    Ok(())
}

// 2. Signer validation
require!(
    ctx.accounts.user.key() == subscription.subscriber,
    ErrorCode::UnauthorizedBurn
);

// 3. Amount validation
require!(
    amount >= MIN_BURN_AMOUNT,  // e.g., 100 tokens
    ErrorCode::InsufficientBurnAmount
);
```

---

## Future Enhancements

### Phase 2: Merchant-Specific Tokens

**Example:** Fartcoin merchant accepts $FARTCOIN directly

```rust
pub struct MerchantAccount {
    // Existing fields...

    /// Optional: Merchant's own token (e.g., $FARTCOIN)
    pub merchant_token: Option<Pubkey>,

    /// Discount for paying in merchant's token
    pub merchant_token_discount_bps: u16,  // e.g., 50 = 0.5% discount
}

// User pays $FARTCOIN → No conversion → Merchant gets $FARTCOIN
// User saves 0.5% on subscription
// Merchant gets their own token (can use for rewards, etc.)
```

### Phase 3: Cross-Chain Payments

- Accept $USDC from Ethereum via Wormhole
- Accept $USDC from Polygon via Portal Bridge
- All settled on Solana

### Phase 4: Fiat On-Ramp Integration

- Moonpay, Ramp, or Transak integration
- User pays USD via credit card → Auto-swap to $USDC → Subscription paid
- Seamless UX for non-crypto users

---

## Implementation Checklist

### Smart Contract Updates

- [ ] **Update lutrii-recurring program:**
  - [ ] Add multi-token support to `Subscription` struct
  - [ ] Add `execute_payment_with_swap()` instruction
  - [ ] Add Jupiter CPI integration
  - [ ] Add fee distribution logic (60/30/10 split)
  - [ ] Add $LUTRII burn discount tracking
  - [ ] Add slippage protection
  - [ ] Add token validation

- [ ] **Update lutrii-merchant-registry:**
  - [ ] Add `settlement_token` field to `MerchantAccount`
  - [ ] Add `accepted_tokens` field
  - [ ] Add `update_merchant_tokens()` instruction
  - [ ] Validate merchant token accounts

- [ ] **Create lutrii-token program (new):**
  - [ ] Create $LUTRII token mint
  - [ ] Set up initial distribution
  - [ ] Create burn instruction
  - [ ] Set up vesting schedules

### Backend Infrastructure

- [ ] **Jupiter Integration:**
  - [ ] Integrate Jupiter API for quotes
  - [ ] Handle route optimization
  - [ ] Implement swap retry logic
  - [ ] Monitor swap failures

- [ ] **LP Management:**
  - [ ] Create multi-sig wallet for LP fees
  - [ ] Set up weekly LP add schedule
  - [ ] Monitor LP pool health
  - [ ] Implement auto-add logic (Phase 2)

- [ ] **Fee Distribution:**
  - [ ] Set up dev wallet
  - [ ] Set up marketing wallet
  - [ ] Set up LP provision wallet
  - [ ] Implement automated transfers

### Token Launch

- [ ] **Pre-Launch:**
  - [ ] Audit $LUTRII token contract
  - [ ] Set up vesting contracts
  - [ ] Create LP pools ($LUTRII/$USDC, $LUTRII/$SOL)
  - [ ] Lock initial liquidity (6 months)

- [ ] **Launch:**
  - [ ] Fair launch sale (10M $LUTRII @ $0.015)
  - [ ] Add raised funds to LP
  - [ ] Distribute team/investor tokens to vesting contracts
  - [ ] Announce on Twitter, Discord, Telegram

- [ ] **Post-Launch:**
  - [ ] Monitor token price and liquidity
  - [ ] Begin staking rewards distribution
  - [ ] Launch merchant/subscriber incentive programs
  - [ ] Track burn metrics

### Mobile App Updates

- [ ] **Token Selection UI:**
  - [ ] Add token picker (SOL, SKR, LUTRII, USDC, USD1)
  - [ ] Show swap preview (e.g., "0.5 SOL → $50 USDC")
  - [ ] Display platform fee + discount
  - [ ] Show slippage tolerance setting

- [ ] **Burn Discount UI:**
  - [ ] "Burn $LUTRII for 20% discount" button
  - [ ] Show burn amount and savings
  - [ ] Display discount expiration date
  - [ ] Track burned amount per subscription

- [ ] **Merchant Token Settings:**
  - [ ] Merchant can select settlement token
  - [ ] Merchant can choose accepted tokens
  - [ ] Display token balances
  - [ ] Show conversion rates

---

## Cost Analysis

### Development Costs

| Task | Estimated Cost | Timeline |
|------|---------------|----------|
| Smart contract updates (multi-token) | $15k-25k | 4-6 weeks |
| Jupiter integration | $5k-10k | 2-3 weeks |
| $LUTRII token launch | $10k-15k | 3-4 weeks |
| Mobile app UI updates | $8k-12k | 3-4 weeks |
| Testing & auditing | $20k-30k | 4-6 weeks |
| **Total Development** | **$58k-92k** | **12-16 weeks** |

### Ongoing Costs

| Item | Cost | Frequency |
|------|------|-----------|
| Jupiter API fees | $0.25 per swap | Per transaction |
| LP provision (from fees) | 30% of platform fees | Automatic |
| Token price monitoring | $500/month | Monthly |
| DEX listing fees | $5k-10k | One-time |

### Break-Even Analysis

**Assumptions:**
- 5,000 active subscriptions
- Average subscription: $20/month
- Average platform fee: 2.0% = $0.40/sub
- Monthly platform revenue: $2,000

**Fee Distribution:**
- Dev wallet: $1,200/month (60%)
- LP provision: $600/month (30%)
- Marketing: $200/month (10%)

**Development ROI:**
- Total dev cost: $75k (midpoint)
- Monthly net (dev wallet): $1,200
- Break-even: 62.5 months (~5 years)

**With 50k subs:**
- Monthly revenue: $20k
- Dev wallet: $12k/month
- Break-even: 6.25 months

**Conclusion:** Multi-token support is expensive to develop but becomes profitable at scale (20k+ subs).

---

## Risks & Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Jupiter downtime | Medium | High | Fallback to direct DEX (Orca) |
| Slippage attacks | Medium | Medium | 1% max slippage, oracle validation |
| LP pool manipulation | Low | High | Monitor pool health, circuit breakers |
| Token price crash | Medium | Medium | Diversify fee tokens, treasury reserves |

### Economic Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Low $LUTRII demand | High | High | Strong burn incentives, staking rewards |
| High swap costs | Medium | Medium | Batch swaps, optimize routes |
| Fee competition | Medium | Medium | Focus on UX, not just price |

### Regulatory Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Token classified as security | Low | Critical | Legal opinion, utility-focused design |
| Money transmitter regulations | Low | High | Non-custodial architecture (already compliant) |
| Tax reporting requirements | High | Medium | Provide transaction export, CPA guidance |

---

## Launch Roadmap

### Month 1-2: Development
- Smart contract updates
- Jupiter integration
- Testing on devnet

### Month 3: Token Launch
- Create $LUTRII token
- Fair launch sale
- Add initial liquidity

### Month 4: Beta Testing
- Limited release (100 users)
- Test multi-token payments
- Monitor swap performance

### Month 5: Mainnet Launch
- Full public release
- Marketing campaign
- Merchant onboarding

### Month 6+: Optimization
- Add more tokens
- Improve swap routing
- Launch staking rewards

---

## Success Metrics

### KPIs to Track

1. **Token Adoption:**
   - % of payments in $LUTRII vs other tokens
   - Total $LUTRII burned (deflationary metric)
   - $LUTRII price stability

2. **Swap Performance:**
   - Average slippage
   - Swap failure rate
   - Time to execute swap

3. **Fee Revenue:**
   - Total platform fees collected
   - Fee distribution (dev/LP/marketing)
   - LP pool TVL growth

4. **User Behavior:**
   - % of users burning $LUTRII for discounts
   - Average tokens burned per user
   - Discount expiration vs renewal rate

---

**Created:** 2026-02-11
**Status:** DESIGN SPECIFICATION
**Next Step:** Review and approve architecture, begin smart contract implementation
**Estimated Timeline:** 12-16 weeks to full launch
**Estimated Cost:** $58k-92k development + $10k-15k token launch

