# Multi-Token Payment Implementation Plan

**Last Updated:** 2026-02-11
**Timeline:** 12-16 weeks
**Budget:** $58k-92k
**Complexity:** HIGH

---

## Phase 1: Smart Contract Updates (Weeks 1-6)

### Week 1-2: Merchant Token Preferences

**Objective:** Allow merchants to configure accepted tokens

#### Tasks:

1. **Update `MerchantAccount` struct** (`lutrii-merchant-registry`)
   ```rust
   pub struct MerchantAccount {
       // Existing fields...

       /// Settlement token (what merchant receives)
       pub settlement_token: Pubkey,           // NEW

       /// Accepted payment tokens (what users can pay with)
       pub accepted_tokens: [Pubkey; 5],       // NEW (max 5 tokens)
       pub accepted_tokens_count: u8,          // NEW

       /// Settlement token account
       pub settlement_token_account: Pubkey,   // NEW
   }
   ```

2. **Create `update_merchant_tokens` instruction**
   - Validate settlement token is supported
   - Validate accepted tokens are supported
   - Update merchant account
   - Emit event

3. **Write tests**
   - Test setting valid tokens
   - Test rejecting unsupported tokens
   - Test updating tokens
   - Test token account validation

**Deliverables:**
- ✅ Updated merchant account struct
- ✅ New instruction implemented
- ✅ 5+ tests passing
- ✅ Documentation updated

**Estimated Effort:** 40 hours

---

### Week 3-4: Multi-Token Subscription Support

**Objective:** Allow subscriptions to be paid in different tokens

#### Tasks:

1. **Update `Subscription` struct** (`lutrii-recurring`)
   ```rust
   pub struct Subscription {
       // Existing fields...

       /// Payment token (what user pays with)
       pub payment_token: Pubkey,              // NEW

       /// Original subscription amount (in merchant's settlement token)
       pub amount: u64,                         // EXISTING

       /// Last swap rate (for analytics)
       pub last_swap_rate: u64,                // NEW (scaled by 1e9)

       /// Total slippage paid (for analytics)
       pub total_slippage: u64,                // NEW
   }
   ```

2. **Add supported tokens constant**
   ```rust
   pub mod supported_tokens {
       use anchor_lang::prelude::Pubkey;

       pub const SOL: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
       pub const USDC: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
       pub const USD1: Pubkey = pubkey!("[USD1_MINT_ADDRESS]");
       pub const SKR: Pubkey = pubkey!("[SKR_MINT_ADDRESS]");
       pub const LUTRII: Pubkey = pubkey!("[LUTRII_MINT_ADDRESS]"); // After token launch

       pub fn is_supported(token: &Pubkey) -> bool {
           token == &SOL || token == &USDC || token == &USD1 || token == &SKR || token == &LUTRII
       }
   }
   ```

3. **Update `create_subscription` instruction**
   - Add `payment_token` parameter
   - Validate payment token is supported
   - Validate payment token is in merchant's accepted tokens
   - Store payment token in subscription account

4. **Write tests**
   - Test creating subscription with each supported token
   - Test rejecting unsupported tokens
   - Test rejecting tokens merchant doesn't accept

**Deliverables:**
- ✅ Updated subscription struct
- ✅ Token validation implemented
- ✅ 8+ tests passing

**Estimated Effort:** 50 hours

---

### Week 5-6: Fee Distribution & $LUTRII Discount

**Objective:** Split fees 60/30/10 and implement burn discount

#### Tasks:

1. **Create fee distribution accounts**
   ```rust
   pub struct FeeDistribution {
       pub dev_wallet: Pubkey,           // 60%
       pub lp_provision: Pubkey,         // 30% (multi-sig PDA)
       pub marketing_wallet: Pubkey,     // 10%
       pub bump: u8,
   }
   ```

2. **Add discount tracking to Subscription**
   ```rust
   pub struct Subscription {
       // Existing fields...

       pub lutrii_burned: u64,                 // NEW
       pub burn_discount_expires: i64,         // NEW
       pub discounted_fee_basis_points: u16,   // NEW
   }
   ```

3. **Create `burn_lutrii_for_discount` instruction**
   - Burn $LUTRII tokens from user
   - Update subscription discount
   - Set expiration (90 days from now)
   - Emit event

4. **Update `calculate_fee` function**
   ```rust
   fn calculate_fee(
       amount: u64,
       merchant_tier: VerificationTier,
       subscription: &Subscription,
       clock: &Clock,
   ) -> Result<u64> {
       // Base fee
       let base_fee_bps = match merchant_tier {
           VerificationTier::Verified => 250,      // 2.5%
           VerificationTier::Community => 150,     // 1.5%
           VerificationTier::Premium => 50,        // 0.5%
           _ => return Err(ErrorCode::InvalidTier.into()),
       };

       // Check discount
       let fee_bps = if subscription.burn_discount_expires > clock.unix_timestamp {
           subscription.discounted_fee_basis_points  // Discounted (e.g., 200 = 2.0%)
       } else {
           base_fee_bps
       };

       // Calculate fee with caps
       let fee = (amount as u128)
           .checked_mul(fee_bps as u128)
           .ok_or(ErrorCode::Overflow)?
           .checked_div(10000)
           .ok_or(ErrorCode::Overflow)? as u64;

       // Apply caps: min $0.01, max $0.50
       let fee = fee.max(10_000).min(500_000);  // USDC has 6 decimals

       Ok(fee)
   }
   ```

5. **Create `distribute_fees` function**
   ```rust
   fn distribute_fees(
       ctx: &Context<ExecutePayment>,
       total_fee: u64,
   ) -> Result<()> {
       let dev_amount = total_fee * 60 / 100;
       let lp_amount = total_fee * 30 / 100;
       let marketing_amount = total_fee - dev_amount - lp_amount; // Remainder to avoid dust

       // Transfer to dev wallet
       token::transfer(
           CpiContext::new(
               ctx.accounts.token_program.to_account_info(),
               Transfer {
                   from: ctx.accounts.temp_fee_account.to_account_info(),
                   to: ctx.accounts.dev_wallet.to_account_info(),
                   authority: ctx.accounts.subscription.to_account_info(),
               },
           ),
           dev_amount,
       )?;

       // Transfer to LP provision
       token::transfer(
           CpiContext::new(
               ctx.accounts.token_program.to_account_info(),
               Transfer {
                   from: ctx.accounts.temp_fee_account.to_account_info(),
                   to: ctx.accounts.lp_provision.to_account_info(),
                   authority: ctx.accounts.subscription.to_account_info(),
               },
           ),
           lp_amount,
       )?;

       // Transfer to marketing
       token::transfer(
           CpiContext::new(
               ctx.accounts.token_program.to_account_info(),
               Transfer {
                   from: ctx.accounts.temp_fee_account.to_account_info(),
                   to: ctx.accounts.marketing_wallet.to_account_info(),
                   authority: ctx.accounts.subscription.to_account_info(),
               },
           ),
           marketing_amount,
       )?;

       emit!(FeesDistributed {
           subscription: ctx.accounts.subscription.key(),
           total_fee,
           dev_amount,
           lp_amount,
           marketing_amount,
       });

       Ok(())
   }
   ```

6. **Write tests**
   - Test fee calculation with/without discount
   - Test fee caps (min/max)
   - Test fee distribution (60/30/10)
   - Test burn discount expiration
   - Test burning tokens
   - Test discount renewal

**Deliverables:**
- ✅ Fee distribution implemented
- ✅ Burn discount implemented
- ✅ 10+ tests passing

**Estimated Effort:** 60 hours

---

## Phase 2: Jupiter Integration (Weeks 7-9)

### Week 7: Jupiter CPI Integration

**Objective:** Integrate Jupiter for token swaps

#### Tasks:

1. **Add Jupiter dependency**
   ```toml
   # Cargo.toml
   [dependencies]
   jupiter-cpi = { version = "0.1.0" }  # Or use Jupiter's SDK
   ```

2. **Create swap helper function**
   ```rust
   use anchor_lang::prelude::*;

   pub fn swap_via_jupiter<'info>(
       jupiter_program: &AccountInfo<'info>,
       user_source_account: &AccountInfo<'info>,
       temp_dest_account: &AccountInfo<'info>,
       source_mint: &Pubkey,
       dest_mint: &Pubkey,
       amount_in: u64,
       min_amount_out: u64,
       remaining_accounts: &[AccountInfo<'info>],  // Route accounts from quote
   ) -> Result<u64> {
       // Build Jupiter swap instruction data
       let swap_data = build_jupiter_swap_ix_data(
           source_mint,
           dest_mint,
           amount_in,
           min_amount_out,
       )?;

       // CPI to Jupiter
       let accounts = vec![
           user_source_account.clone(),
           temp_dest_account.clone(),
           // ... additional accounts from quote
       ];

       anchor_lang::solana_program::program::invoke_signed(
           &anchor_lang::solana_program::instruction::Instruction {
               program_id: *jupiter_program.key,
               accounts: accounts.iter().map(|a| AccountMeta::new(*a.key, false)).collect(),
               data: swap_data,
           },
           &accounts,
           &[],  // No signer seeds needed for user->temp transfer
       )?;

       // Get swapped amount from temp account
       let swapped_amount = get_token_balance(temp_dest_account)?;

       Ok(swapped_amount)
   }
   ```

3. **Update `execute_payment` instruction**
   - Add swap logic if payment_token != settlement_token
   - Get Jupiter quote from remaining accounts
   - Execute swap
   - Verify minimum output
   - Continue with fee distribution and merchant payment

4. **Add slippage protection**
   ```rust
   const MAX_SLIPPAGE_BPS: u16 = 100;  // 1%

   fn calculate_min_output(expected_amount: u64) -> u64 {
       expected_amount * (10000 - MAX_SLIPPAGE_BPS as u64) / 10000
   }
   ```

**Deliverables:**
- ✅ Jupiter CPI working
- ✅ Slippage protection implemented
- ✅ Swap tracked in subscription state

**Estimated Effort:** 80 hours

---

### Week 8-9: Testing & Optimization

**Objective:** Test all token combinations and optimize swap routes

#### Tasks:

1. **Write comprehensive swap tests**
   - SOL → USDC
   - SKR → USDC
   - LUTRII → USDC
   - USD1 → USDC
   - USDC → USD1 (merchant preference)
   - Test slippage protection
   - Test swap failures

2. **Integration testing**
   - Create subscription with SOL
   - Execute payment (SOL → USDC swap)
   - Verify merchant receives USDC
   - Verify fees distributed correctly
   - Verify slippage tracking

3. **Performance optimization**
   - Batch quote requests
   - Cache common routes
   - Optimize compute units

4. **Error handling**
   - Handle insufficient liquidity
   - Handle swap failures
   - Handle slippage exceeded
   - Provide clear error messages

**Deliverables:**
- ✅ 20+ swap tests passing
- ✅ All token combinations tested
- ✅ Performance optimized

**Estimated Effort:** 70 hours

---

## Phase 3: $LUTRII Token Launch (Weeks 10-12)

### Week 10: Token Creation

**Objective:** Create and configure $LUTRII token

#### Tasks:

1. **Create token mint**
   ```bash
   spl-token create-token --decimals 6
   # Output: Token mint address
   ```

2. **Create token metadata** (Metaplex)
   ```json
   {
     "name": "Lutrii",
     "symbol": "LUTRII",
     "description": "Native token of Lutrii - Privacy-first subscription payments on Solana",
     "image": "https://lutrii.com/token-logo.png",
     "external_url": "https://lutrii.com",
     "attributes": [
       {
         "trait_type": "Total Supply",
         "value": "100,000,000"
       },
       {
         "trait_type": "Decimals",
         "value": "6"
       }
     ]
   }
   ```

3. **Set up mint authority**
   - Create multi-sig for mint authority
   - 3-of-5 team members required

4. **Create initial distribution wallets**
   - Team & Founders (20M)
   - Early Investors (15M)
   - Community Rewards (25M)
   - Liquidity (20M)
   - Treasury (15M)
   - Bug Bounty (5M)

5. **Set up vesting contracts**
   - Team: 2-year linear vesting
   - Investors: 1-year cliff + 1-year linear

**Deliverables:**
- ✅ Token created and configured
- ✅ Distribution wallets set up
- ✅ Vesting contracts deployed

**Estimated Effort:** 40 hours

---

### Week 11: Liquidity Provision

**Objective:** Create LP pools and add initial liquidity

#### Tasks:

1. **Create $LUTRII/$USDC pool** (Orca or Raydium)
   - Add 10M $LUTRII + 100k $USDC
   - Initial price: $0.01
   - Lock LP tokens for 6 months

2. **Create $LUTRII/$SOL pool**
   - Add 2M $LUTRII + equivalent SOL
   - Secondary pool for diversification

3. **Set up LP fee collection**
   - Create multi-sig PDA for LP provision wallet
   - Configure fee routing (30% of platform fees)

4. **Set up auto-add logic** (Phase 2 - future)
   - Smart contract to add liquidity when threshold reached
   - Initially: manual weekly additions

**Deliverables:**
- ✅ LP pools created and funded
- ✅ LP tokens locked
- ✅ Fee routing configured

**Estimated Effort:** 30 hours

---

### Week 12: Fair Launch & Distribution

**Objective:** Launch $LUTRII to public

#### Tasks:

1. **Fair launch sale**
   - 10M $LUTRII @ $0.015 (50% premium)
   - Max 100k USDC raise
   - Use Jupiter or custom sale contract

2. **Add raised funds to LP**
   - 50% to $LUTRII/$USDC pool
   - 50% to treasury

3. **Distribute tokens**
   - Send vested tokens to vesting contracts
   - Send community rewards to staking contract
   - Send bug bounty to multi-sig

4. **Announce launch**
   - Twitter announcement
   - Discord announcement
   - Update website
   - Submit to CoinGecko, CoinMarketCap

**Deliverables:**
- ✅ Fair launch completed
- ✅ Tokens distributed
- ✅ Public announcement

**Estimated Effort:** 40 hours

---

## Phase 4: Mobile App Updates (Weeks 10-13)

### Week 10-11: Token Selection UI

**Objective:** Allow users to choose payment token

#### Tasks:

1. **Create token picker component**
   ```typescript
   // mobile/src/components/TokenPicker.tsx
   import { useState } from 'react';
   import { View, Text, TouchableOpacity } from 'react-native';

   const SUPPORTED_TOKENS = [
     { symbol: 'SOL', name: 'Solana', icon: '◎' },
     { symbol: 'USDC', name: 'USD Coin', icon: '$' },
     { symbol: 'USD1', name: 'USD1', icon: '$' },
     { symbol: 'SKR', name: 'Seeker', icon: '🔍' },
     { symbol: 'LUTRII', name: 'Lutrii', icon: '🦎' },
   ];

   export function TokenPicker({ onSelect, merchantAcceptedTokens }) {
     const [selected, setSelected] = useState('USDC');

     const availableTokens = SUPPORTED_TOKENS.filter(token =>
       merchantAcceptedTokens.includes(token.symbol)
     );

     return (
       <View>
         <Text>Pay with:</Text>
         {availableTokens.map(token => (
           <TouchableOpacity
             key={token.symbol}
             onPress={() => {
               setSelected(token.symbol);
               onSelect(token.symbol);
             }}
           >
             <Text>{token.icon} {token.name} ({token.symbol})</Text>
           </TouchableOpacity>
         ))}
       </View>
     );
   }
   ```

2. **Add swap preview**
   ```typescript
   // Show before payment execution
   function SwapPreview({ fromToken, toToken, amount, rate, fee, discount }) {
     const fromAmount = calculateFromAmount(amount, rate);
     const totalCost = fromAmount + fee - discount;

     return (
       <View>
         <Text>You pay: {fromAmount} {fromToken}</Text>
         <Text>Merchant receives: {amount} {toToken}</Text>
         <Text>Platform fee: {fee} {toToken}</Text>
         {discount > 0 && <Text>LUTRII discount: -{discount} {toToken}</Text>}
         <Text>Total: {totalCost} {fromToken}</Text>
       </View>
     );
   }
   ```

3. **Integrate Jupiter quote API**
   - Fetch swap quote before payment
   - Display swap rate and slippage
   - Update preview in real-time

**Deliverables:**
- ✅ Token picker component
- ✅ Swap preview
- ✅ Quote integration

**Estimated Effort:** 40 hours

---

### Week 12-13: Burn Discount UI

**Objective:** Allow users to burn $LUTRII for discounts

#### Tasks:

1. **Create burn discount screen**
   ```typescript
   // mobile/src/screens/BurnForDiscount.tsx
   import { useState } from 'react';
   import { View, Text, Button } from 'react-native';

   export function BurnForDiscount({ subscription }) {
     const [burnAmount, setBurnAmount] = useState(100);
     const discount = calculateDiscount(burnAmount, subscription.merchantTier);
     const annualSavings = discount * 12;

     return (
       <View>
         <Text>Burn $LUTRII for 20% discount</Text>

         <Text>Burn amount: {burnAmount} LUTRII</Text>
         <Text>Monthly savings: ${discount.toFixed(2)}</Text>
         <Text>Annual savings: ${annualSavings.toFixed(2)}</Text>
         <Text>Discount expires: 90 days</Text>

         <Button
           title="Burn & Save"
           onPress={() => executeBurn(subscription.pubkey, burnAmount)}
         />
       </View>
     );
   }

   async function executeBurn(subscriptionPubkey, amount) {
     // Call burn_lutrii_for_discount instruction
     const tx = await program.methods
       .burnLutriiForDiscount(new BN(amount * 1e6))  // 6 decimals
       .accounts({
         subscription: subscriptionPubkey,
         user: wallet.publicKey,
         lutriiMint: LUTRII_MINT,
         userLutriiAccount: getUserLutriiAccount(),
         tokenProgram: TOKEN_PROGRAM_ID,
       })
       .rpc();

     console.log('Burned LUTRII:', tx);
   }
   ```

2. **Show discount status**
   - Display active discount on subscription detail
   - Show expiration countdown
   - Notify when discount expires soon

3. **Add to subscription flow**
   - Show burn option during subscription creation
   - Show burn option in subscription settings

**Deliverables:**
- ✅ Burn discount screen
- ✅ Discount status display
- ✅ User notifications

**Estimated Effort:** 30 hours

---

## Phase 5: Testing & Security (Weeks 14-16)

### Week 14: Devnet Testing

**Objective:** Test all features on devnet

#### Tasks:

1. **Deploy to devnet**
   - Deploy updated programs
   - Deploy $LUTRII token (testnet version)
   - Create test LP pools

2. **End-to-end testing**
   - Create subscriptions with all token combinations
   - Execute payments with swaps
   - Test fee distribution
   - Test burn discounts
   - Test merchant token preferences

3. **Load testing**
   - Simulate 100+ concurrent payments
   - Test swap performance under load
   - Monitor compute unit usage

**Deliverables:**
- ✅ All features working on devnet
- ✅ Load test results
- ✅ Bug fixes

**Estimated Effort:** 50 hours

---

### Week 15: Security Audit

**Objective:** Audit multi-token system for vulnerabilities

#### Tasks:

1. **Internal security review**
   - Review swap logic for vulnerabilities
   - Check slippage protection
   - Verify fee distribution math
   - Check burn discount logic
   - Review access controls

2. **External audit** (Optional but recommended)
   - Hire Sec3, OtterSec, or Neodyme
   - Focus on Jupiter integration
   - Focus on fee distribution
   - Cost: $15k-25k

3. **Bug bounty program**
   - Launch on Immunefi
   - Critical: $50k
   - High: $10k
   - Medium: $2k

**Deliverables:**
- ✅ Security audit report
- ✅ All critical issues fixed
- ✅ Bug bounty live

**Estimated Effort:** 40 hours + audit time

---

### Week 16: Mainnet Launch Prep

**Objective:** Prepare for mainnet deployment

#### Tasks:

1. **Final testing**
   - Run full test suite
   - Verify all edge cases
   - Check error handling

2. **Documentation**
   - Update API docs
   - Update user guides
   - Create merchant guides

3. **Deployment checklist**
   - [ ] All tests passing
   - [ ] Security audit complete
   - [ ] $LUTRII token launched
   - [ ] LP pools funded
   - [ ] Fee wallets configured
   - [ ] Mobile app updated
   - [ ] Marketing materials ready

4. **Deploy to mainnet**
   - Deploy programs
   - Initialize fee distribution
   - Test with small amounts first

**Deliverables:**
- ✅ Mainnet deployment complete
- ✅ Monitoring in place
- ✅ Documentation updated

**Estimated Effort:** 40 hours

---

## Resource Allocation

### Development Team

| Role | Allocation | Cost |
|------|-----------|------|
| Solana/Rust Engineer | Full-time (16 weeks) | $35k-50k |
| Frontend Engineer | Half-time (8 weeks) | $12k-18k |
| Product Manager | Part-time (16 weeks) | $8k-12k |
| Security Auditor | Contract (2 weeks) | $15k-25k |
| **Total** | | **$70k-105k** |

### Infrastructure

| Item | Cost | Notes |
|------|------|-------|
| Devnet testing | Free | Solana devnet |
| Mainnet deployment | $100 | Program deployment |
| RPC costs | $500/month | Helius or Alchemy |
| Jupiter API | $0.25/swap | Only on swaps |
| **Total Year 1** | **~$6,100** | |

---

## Risk Management

### Critical Path Items

1. **Jupiter Integration** (Week 7)
   - Risk: Jupiter API changes or deprecation
   - Mitigation: Have fallback to direct DEX (Orca)

2. **$LUTRII Token Launch** (Week 12)
   - Risk: Low demand, price crash
   - Mitigation: Strong marketing, burn incentives

3. **Security Audit** (Week 15)
   - Risk: Critical vulnerabilities found
   - Mitigation: Allocate buffer time for fixes

### Fallback Plans

**If Jupiter integration fails:**
- Use direct Orca swaps (simpler but less optimal prices)
- Reduce supported tokens to $USDC only initially

**If $LUTRII launch delayed:**
- Launch multi-token support without $LUTRII
- Add $LUTRII later via program update

**If budget exceeded:**
- Prioritize core swap functionality
- Delay burn discount feature
- Skip external audit (use internal review + bug bounty)

---

## Success Criteria

### Phase 1 Success (Week 6)
- ✅ Merchants can configure accepted tokens
- ✅ Subscriptions support multi-token
- ✅ Fee distribution working
- ✅ Burn discount implemented
- ✅ All tests passing

### Phase 2 Success (Week 9)
- ✅ Jupiter swaps working
- ✅ All token combinations tested
- ✅ Slippage protection verified
- ✅ Performance acceptable (<3s per payment)

### Phase 3 Success (Week 12)
- ✅ $LUTRII token launched
- ✅ LP pools funded and locked
- ✅ Fair launch completed
- ✅ Token trading on DEXs

### Phase 4 Success (Week 13)
- ✅ Mobile app updated
- ✅ Token picker working
- ✅ Burn discount UI complete
- ✅ User experience smooth

### Phase 5 Success (Week 16)
- ✅ Security audit passed
- ✅ Mainnet deployment complete
- ✅ Zero critical bugs
- ✅ Monitoring in place

---

## Next Steps

1. **Review this plan** - Approve scope, timeline, budget
2. **Hire Solana engineer** - Full-time for 16 weeks
3. **Set up project management** - GitHub Projects, Linear, or Jira
4. **Begin Phase 1** - Start with merchant token preferences

**Estimated Start Date:** 2026-02-18 (1 week from now)
**Estimated Completion:** 2026-06-02 (16 weeks)

---

**Created:** 2026-02-11
**Status:** READY FOR REVIEW
**Next Action:** Approve plan and begin hiring

