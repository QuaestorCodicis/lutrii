# Lutrii Multi-Token System - Phased Implementation

**Last Updated:** 2026-02-11
**Status:** BUILD PLAN - Phase 1 starts now
**Strategy:** Build and test multi-token, keep $LUTRII ready for later deployment

---

## Phased Rollout Strategy

### Phase 1: Multi-Token Payments (BUILD NOW)
**Timeline:** 8-10 weeks
**Budget:** $40k-60k
**Launch:** Devnet → Mainnet

**What we're building:**
- Support 4 payment tokens: $SOL, $USDC, $USD1, $SKR
- Merchants choose settlement token (default: $USDC)
- Automatic swap via Jupiter
- Fee collection (single wallet, not split yet)
- Mobile UI for token selection

**What we're NOT building yet:**
- ❌ $LUTRII token
- ❌ Burn mechanism
- ❌ Fee splitting (60/30/10)
- ❌ Staking/rewards

### Phase 2: Test & Validate (4-6 weeks)
- Devnet testing (2 weeks)
- Mainnet beta (2-4 weeks, limited users)
- Monitor swap performance
- Gather user feedback
- Fix bugs

### Phase 3: $LUTRII Launch (READY TO GO)
**Triggered when:** You give the signal
**Timeline:** 2 weeks to deploy
**Requirements:** Phase 1 & 2 completed, stable mainnet

**What we deploy:**
- $LUTRII token creation
- Burn mechanism (prepaid fees)
- Fee splitting (60/30/10)
- LP pools ($LUTRII/$USDC, $LUTRII/$SOL)
- Mobile UI for burn/prepay

---

## Phase 1 Architecture (Build Now)

### Supported Tokens (4 Initial)

| Token | Symbol | Mint Address | Purpose |
|-------|--------|--------------|---------|
| Solana | $SOL | So11111...112 | Native gas token |
| USD Coin | $USDC | EPjFWd...TDt1v | Default settlement |
| USD1 | $USD1 | [TBD - WLFI] | Alternative stablecoin |
| Seeker | $SKR | [TBD - Solana Mobile] | Mobile ecosystem |

**$LUTRII reserved for Phase 3** (code ready, not deployed)

### Smart Contract Changes

#### Update `MerchantAccount` struct

```rust
pub struct MerchantAccount {
    pub owner: Pubkey,
    pub bump: u8,
    pub verification_tier: VerificationTier,
    pub total_subscriptions: u64,
    pub total_revenue: u64,
    pub reputation_score: u16,
    pub created_at: i64,

    // NEW FIELDS (Phase 1)
    pub settlement_token: Pubkey,           // Token merchant receives (default: USDC)
    pub accepted_tokens: [Pubkey; 4],       // Max 4 tokens (SOL, USDC, USD1, SKR)
    pub accepted_tokens_count: u8,          // How many are actually set
    pub settlement_token_account: Pubkey,   // Merchant's token account for settlement

    // RESERVED FOR PHASE 3
    pub reserved1: [u8; 32],                // Will become: lutrii_discount_eligible
    pub reserved2: u64,                     // Will become: total_lutrii_received
    pub reserved3: u64,                     // Will become: prepaid_fees_collected
}
```

#### Update `Subscription` struct

```rust
pub struct Subscription {
    pub subscriber: Pubkey,
    pub merchant: Pubkey,
    pub merchant_owner: Pubkey,
    pub token_account: Pubkey,
    pub amount: u64,
    pub interval: SubscriptionInterval,
    pub next_payment: i64,
    pub created_at: i64,
    pub last_payment: i64,
    pub payment_count: u64,
    pub total_paid: u64,
    pub is_active: bool,
    pub payment_in_progress: bool,
    pub bump: u8,

    // NEW FIELDS (Phase 1)
    pub payment_token: Pubkey,              // Token user pays with (e.g., SOL)
    pub last_swap_rate: u64,                // Exchange rate on last payment (scaled 1e9)
    pub total_swap_slippage: u64,           // Cumulative slippage for analytics

    // RESERVED FOR PHASE 3
    pub reserved1: i64,                     // Will become: fee_prepaid_until
    pub reserved2: u64,                     // Will become: total_lutrii_burned
    pub reserved3: u8,                      // Will become: prepaid_times
    pub reserved4: [u8; 31],                // Padding for alignment
}
```

**Key design:** Using `reserved` fields so we can add $LUTRII features later WITHOUT redeploying the entire program.

---

## Upgrade Path for Phase 3

### How We'll Add $LUTRII Later

**Option 1: Program Upgrade (Recommended)**
- Solana programs are upgradeable (if we maintain upgrade authority)
- Deploy new program version with burn instructions
- Existing subscriptions auto-compatible (reserved fields become active)

**Option 2: New Program + CPI**
- Deploy separate "lutrii-burns" program
- Original program calls it via CPI for burn logic
- Keeps core logic isolated

**We'll use Option 1** - cleaner, less complexity.

### Reserved Instructions (Phase 3)

These will be added later but planned now:

```rust
// PHASE 3 INSTRUCTIONS (not implemented yet)

/// Prepay annual fees with $LUTRII at 50% discount
pub fn prepay_annual_fees(
    ctx: Context<PrepayAnnualFees>,
    subscription_pubkey: Pubkey,
) -> Result<()> {
    // Calculate annual fees
    // Get $LUTRII price from Pyth
    // Burn tokens
    // Set fee_prepaid_until
}

/// Update fee distribution wallets (dev/LP/marketing)
pub fn update_fee_wallets(
    ctx: Context<UpdateFeeWallets>,
    dev_wallet: Pubkey,
    lp_wallet: Pubkey,
    marketing_wallet: Pubkey,
) -> Result<()> {
    // Admin only
    // Set fee distribution addresses
}
```

---

## Phase 1 Implementation (Start Now)

### Week 1-2: Merchant Token Configuration

**Goal:** Merchants can set accepted tokens and settlement token

**Tasks:**

1. **Update `lutrii-merchant-registry` program:**

```rust
// New instruction: update_merchant_tokens
pub fn update_merchant_tokens(
    ctx: Context<UpdateMerchantTokens>,
    settlement_token: Pubkey,
    accepted_tokens: Vec<Pubkey>,
) -> Result<()> {
    let merchant = &mut ctx.accounts.merchant;

    // Validate settlement token
    require!(
        is_supported_token(&settlement_token),
        ErrorCode::UnsupportedToken
    );

    // Validate accepted tokens (max 4)
    require!(
        accepted_tokens.len() <= 4,
        ErrorCode::TooManyTokens
    );

    for token in &accepted_tokens {
        require!(
            is_supported_token(token),
            ErrorCode::UnsupportedToken
        );
    }

    // Update merchant account
    merchant.settlement_token = settlement_token;
    merchant.accepted_tokens_count = accepted_tokens.len() as u8;

    for (i, token) in accepted_tokens.iter().enumerate() {
        merchant.accepted_tokens[i] = *token;
    }

    emit!(MerchantTokensUpdated {
        merchant: merchant.key(),
        settlement_token,
        accepted_tokens_count: merchant.accepted_tokens_count,
    });

    Ok(())
}

// Helper function
pub fn is_supported_token(token: &Pubkey) -> bool {
    *token == SOL_MINT ||
    *token == USDC_MINT ||
    *token == USD1_MINT ||
    *token == SKR_MINT
    // NOT including LUTRII yet
}
```

2. **Add token mints to constants:**

```rust
// programs/lutrii-merchant-registry/src/constants.rs
use anchor_lang::prelude::*;

// Phase 1 supported tokens
pub const SOL_MINT: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const USD1_MINT: Pubkey = pubkey!("[USD1_MINT_MAINNET]"); // Update when available
pub const SKR_MINT: Pubkey = pubkey!("[SKR_MINT_MAINNET]");   // Update when available

// Phase 3 (reserved, not used yet)
// pub const LUTRII_MINT: Pubkey = pubkey!("[LUTRII_MINT]");
```

3. **Write tests:**

```typescript
// tests/merchant-tokens.ts
describe("Merchant Token Configuration", () => {
  it("Sets settlement token to USDC", async () => {
    await program.methods
      .updateMerchantTokens(
        USDC_MINT,
        [USDC_MINT, SOL_MINT, USD1_MINT]
      )
      .accounts({
        merchant: merchantPDA,
        merchantOwner: merchantOwner.publicKey,
      })
      .signers([merchantOwner])
      .rpc();

    const merchant = await program.account.merchantAccount.fetch(merchantPDA);
    assert.equal(merchant.settlementToken.toString(), USDC_MINT.toString());
    assert.equal(merchant.acceptedTokensCount, 3);
  });

  it("Rejects more than 4 accepted tokens", async () => {
    try {
      await program.methods
        .updateMerchantTokens(
          USDC_MINT,
          [SOL_MINT, USDC_MINT, USD1_MINT, SKR_MINT, LUTRII_MINT] // 5 tokens
        )
        .accounts({...})
        .signers([merchantOwner])
        .rpc();
      assert.fail("Should have failed");
    } catch (err) {
      assert.ok(err.toString().includes("TooManyTokens"));
    }
  });

  it("Rejects unsupported tokens", async () => {
    const FAKE_TOKEN = Keypair.generate().publicKey;
    try {
      await program.methods
        .updateMerchantTokens(USDC_MINT, [FAKE_TOKEN])
        .accounts({...})
        .signers([merchantOwner])
        .rpc();
      assert.fail("Should have failed");
    } catch (err) {
      assert.ok(err.toString().includes("UnsupportedToken"));
    }
  });
});
```

**Deliverables:**
- ✅ Merchants can configure tokens
- ✅ Validation prevents unsupported tokens
- ✅ Tests passing

**Estimated Effort:** 40 hours

---

### Week 3-4: Multi-Token Subscription Creation

**Goal:** Users can create subscriptions with any accepted token

**Tasks:**

1. **Update `create_subscription` instruction:**

```rust
pub fn create_subscription(
    ctx: Context<CreateSubscription>,
    amount: u64,
    interval: SubscriptionInterval,
    payment_token: Pubkey, // NEW PARAMETER
) -> Result<()> {
    // Load merchant account
    let merchant_data = MerchantAccount::try_deserialize(
        &mut ctx.accounts.merchant_account.try_borrow_data()?.as_ref()
    )?;

    // Validate merchant is verified
    require!(
        merchant_data.verification_tier != VerificationTier::Unverified,
        ErrorCode::MerchantNotVerified
    );

    // NEW: Validate payment token is accepted by merchant
    let is_accepted = (0..merchant_data.accepted_tokens_count)
        .any(|i| merchant_data.accepted_tokens[i as usize] == payment_token);

    require!(
        is_accepted,
        ErrorCode::TokenNotAcceptedByMerchant
    );

    // Initialize subscription
    let subscription = &mut ctx.accounts.subscription;
    subscription.subscriber = ctx.accounts.subscriber.key();
    subscription.merchant = ctx.accounts.merchant_account.key();
    subscription.merchant_owner = merchant_data.owner;
    subscription.token_account = ctx.accounts.user_token_account.key();
    subscription.amount = amount;
    subscription.interval = interval;
    subscription.payment_token = payment_token; // NEW
    subscription.created_at = Clock::get()?.unix_timestamp;
    subscription.next_payment = Clock::get()?.unix_timestamp;
    subscription.is_active = true;
    subscription.bump = ctx.bumps.subscription;

    // Delegate tokens
    // ... existing delegation logic ...

    emit!(SubscriptionCreated {
        subscription: subscription.key(),
        subscriber: subscription.subscriber,
        merchant: subscription.merchant,
        amount,
        interval,
        payment_token, // NEW
    });

    Ok(())
}
```

2. **Add new error codes:**

```rust
#[error_code]
pub enum ErrorCode {
    // Existing errors...

    #[msg("Payment token not accepted by merchant")]
    TokenNotAcceptedByMerchant,

    #[msg("Unsupported token")]
    UnsupportedToken,

    #[msg("Too many accepted tokens (max 4)")]
    TooManyTokens,
}
```

3. **Write tests:**

```typescript
describe("Multi-Token Subscriptions", () => {
  it("Creates subscription with SOL payment", async () => {
    await program.methods
      .createSubscription(
        new BN(5_000_000_000), // 5 SOL
        { monthly: {} },
        SOL_MINT // Pay with SOL
      )
      .accounts({
        subscription: subscriptionPDA,
        subscriber: user.publicKey,
        merchantAccount: merchantPDA,
        userTokenAccount: userSolAccount,
        // ...
      })
      .signers([user])
      .rpc();

    const sub = await program.account.subscription.fetch(subscriptionPDA);
    assert.equal(sub.paymentToken.toString(), SOL_MINT.toString());
  });

  it("Rejects token not accepted by merchant", async () => {
    // Merchant only accepts USDC
    await program.methods
      .updateMerchantTokens(USDC_MINT, [USDC_MINT])
      .accounts({...})
      .rpc();

    // User tries to pay with SOL
    try {
      await program.methods
        .createSubscription(amount, interval, SOL_MINT)
        .accounts({...})
        .rpc();
      assert.fail("Should have failed");
    } catch (err) {
      assert.ok(err.toString().includes("TokenNotAcceptedByMerchant"));
    }
  });
});
```

**Deliverables:**
- ✅ Users can choose payment token
- ✅ Validation ensures merchant accepts token
- ✅ Tests passing

**Estimated Effort:** 50 hours

---

### Week 5-6: Jupiter Swap Integration

**Goal:** Execute payment with automatic token swap if needed

**Tasks:**

1. **Add Jupiter dependency:**

```toml
# programs/lutrii-recurring/Cargo.toml
[dependencies]
anchor-lang = "0.30.1"
anchor-spl = "0.30.1"
# Jupiter integration (check latest version)
# We may need to implement CPI manually or use Jupiter SDK
```

2. **Create swap helper:**

```rust
// programs/lutrii-recurring/src/utils/swap.rs

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

pub fn needs_swap(payment_token: &Pubkey, settlement_token: &Pubkey) -> bool {
    payment_token != settlement_token
}

pub fn execute_jupiter_swap<'info>(
    jupiter_program: &AccountInfo<'info>,
    user_source_account: &Account<'info, TokenAccount>,
    temp_dest_account: &Account<'info, TokenAccount>,
    source_mint: &Pubkey,
    dest_mint: &Pubkey,
    amount_in: u64,
    min_amount_out: u64,
    remaining_accounts: &[AccountInfo<'info>], // Jupiter route accounts
) -> Result<u64> {
    // Build Jupiter swap instruction
    // This is pseudocode - actual implementation depends on Jupiter SDK

    // 1. Transfer source tokens to Jupiter
    // 2. CPI to Jupiter swap
    // 3. Receive dest tokens
    // 4. Return swapped amount

    // For now, placeholder - we'll implement full Jupiter integration
    // after setting up accounts structure

    msg!("Executing Jupiter swap: {} {} -> {} {}",
         amount_in, source_mint, dest_mint, min_amount_out);

    // Placeholder return
    Ok(min_amount_out)
}

pub fn calculate_min_output_with_slippage(
    expected_amount: u64,
    slippage_bps: u16, // e.g., 100 = 1%
) -> u64 {
    let slippage_factor = 10000u128 - slippage_bps as u128;
    let min_output = (expected_amount as u128 * slippage_factor) / 10000u128;
    min_output as u64
}
```

3. **Update `execute_payment` instruction:**

```rust
pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;
    let merchant_data = MerchantAccount::try_deserialize(
        &mut ctx.accounts.merchant_account.try_borrow_data()?.as_ref()
    )?;

    // CHECKS
    require!(!subscription.payment_in_progress, ErrorCode::PaymentInProgress);
    require!(subscription.is_active, ErrorCode::SubscriptionNotActive);

    let clock = Clock::get()?;
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

    // NEW: Check if swap needed
    let needs_swap = subscription.payment_token != merchant_data.settlement_token;

    let merchant_receives = if needs_swap {
        // Execute swap via Jupiter
        let total_needed = subscription_amount.checked_add(platform_fee).unwrap();

        // Get swap quote (passed via remaining accounts or instruction data)
        let min_output = calculate_min_output_with_slippage(total_needed, 100); // 1% slippage

        let swapped_amount = execute_jupiter_swap(
            &ctx.accounts.jupiter_program,
            &ctx.accounts.user_payment_token_account,
            &ctx.accounts.temp_settlement_token_account,
            &subscription.payment_token,
            &merchant_data.settlement_token,
            total_needed,
            min_output,
            ctx.remaining_accounts,
        )?;

        // Verify swap output meets minimum
        require!(
            swapped_amount >= min_output,
            ErrorCode::SlippageExceeded
        );

        // Track swap rate for analytics
        let swap_rate = (swapped_amount as u128 * 1_000_000_000) / total_needed as u128;
        subscription.last_swap_rate = swap_rate as u64;

        swapped_amount
    } else {
        // No swap needed - direct transfer
        subscription_amount.checked_add(platform_fee).unwrap()
    };

    // INTERACTIONS - External transfers

    // 1. Transfer platform fee (from swapped tokens or direct)
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: if needs_swap {
                    ctx.accounts.temp_settlement_token_account.to_account_info()
                } else {
                    ctx.accounts.user_payment_token_account.to_account_info()
                },
                to: ctx.accounts.platform_fee_account.to_account_info(),
                authority: if needs_swap {
                    ctx.accounts.temp_settlement_token_account.to_account_info() // PDA authority
                } else {
                    subscription.to_account_info()
                },
            },
            if needs_swap {
                &[&[
                    b"temp_settlement",
                    subscription.key().as_ref(),
                    &[ctx.bumps.temp_settlement_token_account]
                ]]
            } else {
                &[&[
                    b"subscription",
                    subscription.subscriber.as_ref(),
                    subscription.merchant_owner.as_ref(),
                    &[subscription.bump]
                ]]
            },
        ),
        platform_fee,
    )?;

    // 2. Transfer to merchant (remaining after fee)
    let merchant_amount = merchant_receives.checked_sub(platform_fee).unwrap();
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::Transfer {
                from: if needs_swap {
                    ctx.accounts.temp_settlement_token_account.to_account_info()
                } else {
                    ctx.accounts.user_payment_token_account.to_account_info()
                },
                to: merchant_data.settlement_token_account,
                authority: if needs_swap {
                    ctx.accounts.temp_settlement_token_account.to_account_info()
                } else {
                    subscription.to_account_info()
                },
            },
            &[/* signer seeds */],
        ),
        merchant_amount,
    )?;

    // Update subscription state
    subscription.last_payment = clock.unix_timestamp;
    subscription.next_payment = calculate_next_payment(
        subscription.next_payment,
        subscription.interval,
    );
    subscription.payment_count += 1;
    subscription.total_paid = subscription.total_paid.checked_add(subscription_amount).unwrap();

    // Clear reentrancy guard
    subscription.payment_in_progress = false;

    emit!(PaymentExecuted {
        subscription: subscription.key(),
        amount: subscription_amount,
        merchant_received: merchant_amount,
        platform_fee,
        swap_executed: needs_swap,
        swap_rate: if needs_swap { subscription.last_swap_rate } else { 0 },
    });

    Ok(())
}
```

**Deliverables:**
- ✅ Swap integration (Jupiter or fallback)
- ✅ Slippage protection
- ✅ Direct transfer if no swap needed
- ✅ Tests passing

**Estimated Effort:** 80 hours

---

### Week 7-8: Mobile App UI

**Goal:** Users can select payment token and see swap preview

**Tasks:**

1. **Token picker component:**

```typescript
// mobile/src/components/TokenPicker.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { PublicKey } from '@solana/web3.js';

const SUPPORTED_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    icon: require('../assets/sol-icon.png'),
    decimals: 9,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    icon: require('../assets/usdc-icon.png'),
    decimals: 6,
  },
  {
    symbol: 'USD1',
    name: 'USD1',
    mint: new PublicKey('[USD1_MINT]'),
    icon: require('../assets/usd1-icon.png'),
    decimals: 6,
  },
  {
    symbol: 'SKR',
    name: 'Seeker',
    mint: new PublicKey('[SKR_MINT]'),
    icon: require('../assets/skr-icon.png'),
    decimals: 9,
  },
  // LUTRII will be added in Phase 3
];

interface TokenPickerProps {
  merchantAcceptedTokens: PublicKey[];
  selectedToken: PublicKey;
  onSelectToken: (token: PublicKey) => void;
  userBalances: Record<string, number>;
}

export function TokenPicker({
  merchantAcceptedTokens,
  selectedToken,
  onSelectToken,
  userBalances,
}: TokenPickerProps) {
  const availableTokens = SUPPORTED_TOKENS.filter(token =>
    merchantAcceptedTokens.some(accepted => accepted.equals(token.mint))
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pay with:</Text>
      {availableTokens.map(token => {
        const balance = userBalances[token.mint.toString()] || 0;
        const isSelected = selectedToken.equals(token.mint);

        return (
          <TouchableOpacity
            key={token.symbol}
            style={[styles.tokenOption, isSelected && styles.selectedOption]}
            onPress={() => onSelectToken(token.mint)}
          >
            <Image source={token.icon} style={styles.tokenIcon} />
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenName}>{token.name}</Text>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
            </View>
            <Text style={styles.balance}>
              {balance.toFixed(2)} {token.symbol}
            </Text>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
```

2. **Swap preview:**

```typescript
// mobile/src/components/SwapPreview.tsx
import { View, Text } from 'react-native';
import { PublicKey } from '@solana/web3.js';
import { useJupiterQuote } from '../hooks/useJupiterQuote';

interface SwapPreviewProps {
  fromToken: PublicKey;
  toToken: PublicKey;
  subscriptionAmount: number;
  platformFee: number;
}

export function SwapPreview({
  fromToken,
  toToken,
  subscriptionAmount,
  platformFee,
}: SwapPreviewProps) {
  const totalNeeded = subscriptionAmount + platformFee;

  // Get Jupiter quote
  const { quote, loading, error } = useJupiterQuote(
    fromToken,
    toToken,
    totalNeeded
  );

  if (fromToken.equals(toToken)) {
    // No swap needed
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Payment Summary</Text>
        <Row label="Subscription" value={`${subscriptionAmount} USDC`} />
        <Row label="Platform fee" value={`${platformFee} USDC`} />
        <Divider />
        <Row label="Total" value={`${totalNeeded} USDC`} bold />
      </View>
    );
  }

  if (loading) {
    return <Text>Loading quote...</Text>;
  }

  if (error || !quote) {
    return <Text>Failed to get swap quote</Text>;
  }

  const fromAmount = quote.inAmount;
  const rate = quote.outAmount / quote.inAmount;
  const slippage = quote.slippageBps / 100; // Convert basis points to %

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Summary (with swap)</Text>

      <Row
        label="You pay"
        value={`${fromAmount} ${getTokenSymbol(fromToken)}`}
      />
      <Row
        label="Swaps to"
        value={`~${totalNeeded} ${getTokenSymbol(toToken)}`}
      />
      <Row
        label="Exchange rate"
        value={`1 ${getTokenSymbol(fromToken)} = ${rate.toFixed(4)} ${getTokenSymbol(toToken)}`}
        small
      />
      <Row
        label="Max slippage"
        value={`${slippage}%`}
        small
      />

      <Divider />

      <Row
        label="Merchant receives"
        value={`${subscriptionAmount} ${getTokenSymbol(toToken)}`}
      />
      <Row
        label="Platform fee"
        value={`${platformFee} ${getTokenSymbol(toToken)}`}
      />
    </View>
  );
}
```

3. **Jupiter quote hook:**

```typescript
// mobile/src/hooks/useJupiterQuote.ts
import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

interface JupiterQuote {
  inAmount: number;
  outAmount: number;
  slippageBps: number;
  route: any; // Jupiter route data
}

export function useJupiterQuote(
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: number
) {
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      setLoading(true);
      setError(null);

      try {
        // Call Jupiter Quote API
        const response = await fetch(
          `https://quote-api.jup.ag/v6/quote?` +
          `inputMint=${inputMint.toString()}&` +
          `outputMint=${outputMint.toString()}&` +
          `amount=${amount}&` +
          `slippageBps=100` // 1% slippage
        );

        const data = await response.json();

        setQuote({
          inAmount: parseFloat(data.inAmount),
          outAmount: parseFloat(data.outAmount),
          slippageBps: data.slippageBps,
          route: data,
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (amount > 0) {
      fetchQuote();
    }
  }, [inputMint, outputMint, amount]);

  return { quote, loading, error };
}
```

**Deliverables:**
- ✅ Token picker UI
- ✅ Swap preview with Jupiter quotes
- ✅ User-friendly payment summary

**Estimated Effort:** 40 hours

---

## Phase 3 Architecture (Ready to Deploy Later)

### $LUTRII Token Structure

```rust
// This will be created in Phase 3

/// Token Metadata (Metaplex)
{
  "name": "Lutrii",
  "symbol": "LUTRII",
  "decimals": 6,
  "supply": 100000000000000, // 100M tokens × 10^6 decimals
  "description": "Native token of Lutrii - Privacy-first subscription payments"
}

/// Distribution (stored in vesting contracts)
pub struct TokenDistribution {
    pub team_allocation: u64,          // 20M (20%)
    pub investors_allocation: u64,     // 15M (15%)
    pub community_rewards: u64,        // 25M (25%)
    pub liquidity: u64,                // 20M (20%)
    pub treasury: u64,                 // 15M (15%)
    pub bug_bounty: u64,               // 5M (5%)
}
```

### Burn Mechanism (Ready to Deploy)

```rust
// programs/lutrii-recurring/src/instructions/prepay_fees.rs
// This will be added in Phase 3

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Token, TokenAccount, Mint};
use pyth_sdk_solana::load_price_feed_from_account_info;

#[derive(Accounts)]
pub struct PrepayAnnualFees<'info> {
    #[account(
        mut,
        has_one = subscriber,
        seeds = [b"subscription", subscriber.key().as_ref(), merchant_owner.as_ref()],
        bump = subscription.bump
    )]
    pub subscription: Account<'info, Subscription>,

    #[account(mut)]
    pub subscriber: Signer<'info>,

    /// CHECK: Merchant owner for PDA derivation
    pub merchant_owner: AccountInfo<'info>,

    #[account(mut)]
    pub lutrii_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = user_lutrii_account.owner == subscriber.key(),
        constraint = user_lutrii_account.mint == lutrii_mint.key(),
    )]
    pub user_lutrii_account: Account<'info, TokenAccount>,

    /// Pyth price feed: $LUTRII/$USDC
    /// CHECK: Validated in handler using Pyth SDK
    pub lutrii_price_feed: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn prepay_annual_fees(ctx: Context<PrepayAnnualFees>) -> Result<()> {
    let subscription = &ctx.accounts.subscription;
    let clock = Clock::get()?;

    // 1. Calculate annual fees
    let monthly_amount = subscription.amount;
    let annual_value = monthly_amount.checked_mul(12).unwrap();

    // Get merchant tier from merchant account (load via CPI or remaining accounts)
    // For now, assume 2.5% fee (Verified tier)
    let fee_bps = 250u16;
    let annual_fees = (annual_value as u128)
        .checked_mul(fee_bps as u128)
        .unwrap()
        .checked_div(10000)
        .unwrap() as u64;

    // 2. Calculate burn amount (50% of annual fees)
    let burn_value_usdc = annual_fees / 2;

    // 3. Get $LUTRII price from Pyth oracle
    let price_feed = load_price_feed_from_account_info(&ctx.accounts.lutrii_price_feed)
        .map_err(|_| error!(ErrorCode::InvalidPriceFeed))?;

    let price = price_feed.get_current_price()
        .ok_or(ErrorCode::StalePriceFeed)?;

    // Price is scaled by 10^price.expo (usually negative)
    // Convert to USDC terms (6 decimals)
    let lutrii_price_usdc = (price.price as u64)
        .checked_mul(1_000_000) // USDC decimals
        .unwrap()
        .checked_div((10i64.pow((-price.expo) as u32)) as u64)
        .unwrap();

    // 4. Calculate $LUTRII tokens to burn
    let lutrii_to_burn = (burn_value_usdc as u128)
        .checked_mul(1_000_000) // LUTRII decimals
        .unwrap()
        .checked_div(lutrii_price_usdc as u128)
        .unwrap() as u64;

    // 5. Burn $LUTRII tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.lutrii_mint.to_account_info(),
                from: ctx.accounts.user_lutrii_account.to_account_info(),
                authority: ctx.accounts.subscriber.to_account_info(),
            },
        ),
        lutrii_to_burn,
    )?;

    // 6. Update subscription (use reserved fields)
    let subscription = &mut ctx.accounts.subscription;
    subscription.reserved1 = clock.unix_timestamp + (365 * 86400); // fee_prepaid_until
    subscription.reserved2 = subscription.reserved2.checked_add(lutrii_to_burn).unwrap(); // total_lutrii_burned
    subscription.reserved3 = subscription.reserved3.wrapping_add(1); // prepaid_times

    emit!(AnnualFeesPrepaid {
        subscription: subscription.key(),
        subscriber: subscription.subscriber,
        lutrii_burned: lutrii_to_burn,
        burn_value_usdc,
        prepaid_until: subscription.reserved1,
        lutrii_price: lutrii_price_usdc,
    });

    Ok(())
}
```

### Fee Splitting (Ready to Deploy)

```rust
// programs/lutrii-recurring/src/state/fee_wallets.rs
// This will be added in Phase 3

use anchor_lang::prelude::*;

#[account]
pub struct FeeWallets {
    pub authority: Pubkey,           // Admin who can update wallets
    pub dev_wallet: Pubkey,          // 60%
    pub lp_provision: Pubkey,        // 30% (multi-sig PDA)
    pub marketing_wallet: Pubkey,    // 10%
    pub bump: u8,
}

impl FeeWallets {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 1;
}

// Helper function to distribute fees
pub fn distribute_platform_fee(
    fee_wallets: &FeeWallets,
    token_program: &AccountInfo,
    source_account: &AccountInfo,
    total_fee: u64,
    authority: &[&[&[u8]]],
) -> Result<()> {
    let dev_amount = total_fee.checked_mul(60).unwrap().checked_div(100).unwrap();
    let lp_amount = total_fee.checked_mul(30).unwrap().checked_div(100).unwrap();
    let marketing_amount = total_fee.checked_sub(dev_amount).unwrap().checked_sub(lp_amount).unwrap();

    // Transfer to dev wallet
    token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::Transfer {
                from: source_account.clone(),
                to: fee_wallets.dev_wallet, // Load token account
                authority: source_account.clone(),
            },
            authority,
        ),
        dev_amount,
    )?;

    // Transfer to LP provision
    token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::Transfer {
                from: source_account.clone(),
                to: fee_wallets.lp_provision,
                authority: source_account.clone(),
            },
            authority,
        ),
        lp_amount,
    )?;

    // Transfer to marketing
    token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            token::Transfer {
                from: source_account.clone(),
                to: fee_wallets.marketing_wallet,
                authority: source_account.clone(),
            },
            authority,
        ),
        marketing_amount,
    )?;

    Ok(())
}
```

---

## Testing Strategy

### Phase 1 Testing (Devnet)

**Week 9-10: Devnet Deployment**

1. **Deploy updated programs to devnet:**
   ```bash
   anchor build
   anchor deploy --provider.cluster devnet
   ```

2. **Create test scenarios:**
   - Merchant sets USDC as settlement, accepts [SOL, USDC, USD1]
   - User creates subscription paying with SOL (swap needed)
   - User creates subscription paying with USDC (no swap)
   - Execute payment with swap (SOL → USDC)
   - Execute payment without swap (USDC → USDC)
   - Test all 4 token combinations

3. **Performance testing:**
   - Measure swap latency
   - Measure slippage on different amounts
   - Test with low liquidity pairs

4. **Mobile app testing:**
   - Token picker shows correct accepted tokens
   - Swap preview updates in real-time
   - Payment execution with swap works end-to-end

**Success Criteria:**
- ✅ All 4 tokens work as payment methods
- ✅ Swaps complete in <5 seconds
- ✅ Slippage stays under 1% for normal amounts
- ✅ Zero critical bugs

### Phase 2 Testing (Mainnet Beta)

**Week 11-14: Limited Mainnet**

1. **Deploy to mainnet (upgrade authority retained)**
2. **Limited beta:**
   - 50 trusted users
   - Small subscription amounts (<$50)
   - Monitor all transactions
3. **Gather feedback:**
   - UX issues
   - Swap performance
   - Gas costs
4. **Iterate based on feedback**

**Success Criteria:**
- ✅ 100+ successful payments
- ✅ Zero lost funds
- ✅ User satisfaction >4.5/5
- ✅ <1% swap failures

---

## Deployment Checklist

### Phase 1 Launch (Multi-Token)

**Pre-Deploy:**
- [ ] All tests passing (50+ tests)
- [ ] Security review complete
- [ ] Devnet testing (2 weeks)
- [ ] Program audit (optional but recommended)
- [ ] Update documentation
- [ ] Mobile app builds ready (iOS + Android)

**Deploy:**
- [ ] Deploy programs to mainnet
- [ ] Initialize fee wallet (single wallet for Phase 1)
- [ ] Update frontend to use mainnet programs
- [ ] Submit mobile apps to stores
- [ ] Marketing announcement

**Post-Deploy:**
- [ ] Monitor transactions for 48 hours
- [ ] Be ready to pause if issues found
- [ ] Gather user feedback
- [ ] Track key metrics (swap success rate, avg slippage)

### Phase 3 Launch ($LUTRII + Burns)

**When:** After Phase 1 is stable on mainnet (4-8 weeks minimum)

**Pre-Deploy:**
- [ ] Phase 1 stable (>1000 successful payments)
- [ ] User demand validated
- [ ] Legal opinion obtained
- [ ] Tokenomics finalized
- [ ] LP pool partners confirmed

**Deploy:**
- [ ] Create $LUTRII token
- [ ] Fund LP pools (lock liquidity)
- [ ] Upgrade programs with burn instructions
- [ ] Deploy fee splitting
- [ ] Pyth oracle integration
- [ ] Mobile UI for prepay/burn

**Post-Deploy:**
- [ ] Monitor burn adoption
- [ ] Track token price
- [ ] Ensure LP pool health
- [ ] Community education

---

## Cost Breakdown (Phase 1 Only)

| Item | Cost | Timeline |
|------|------|----------|
| Solana developer (8 weeks) | $25k-40k | Weeks 1-8 |
| Frontend developer (4 weeks) | $8k-12k | Weeks 7-10 |
| Jupiter integration consulting | $5k-10k | Week 5-6 |
| Security review (internal) | $5k | Week 8 |
| Devnet testing | $0 | Week 9-10 |
| Mainnet deployment | $100 | Week 11 |
| **Phase 1 Total** | **$43k-67k** | **10-11 weeks** |

**Phase 3 costs (later):**
- Token launch: $10k-15k
- Security audit: $15k-25k
- Marketing: $10k-20k
- **Phase 3 Total:** $35k-60k (when ready)

---

## Summary

**Phase 1 (Build Now):**
- Multi-token payments: $SOL, $USDC, $USD1, $SKR
- Jupiter swap integration
- 10-11 weeks, $43k-67k
- Test on devnet + mainnet beta

**Phase 2 (Validate):**
- Mainnet deployment
- 100+ real transactions
- User feedback
- Stability verification

**Phase 3 (When You're Ready):**
- $LUTRII token launch
- Burn mechanism (prepaid fees)
- Fee splitting (60/30/10)
- LP pools
- 2 weeks to deploy

**Current Status:**
- Architecture designed ✅
- Upgrade path planned ✅
- Reserved fields in smart contracts ✅
- Ready to start Phase 1 development ✅

---

**Created:** 2026-02-11
**Status:** READY TO BUILD
**Next Action:** Begin Phase 1 Week 1-2 (Merchant Token Configuration)

