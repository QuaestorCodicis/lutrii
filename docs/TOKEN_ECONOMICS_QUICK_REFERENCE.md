# Lutrii Multi-Token System - Quick Reference

**Last Updated:** 2026-02-11
**Status:** DESIGN APPROVED - Ready for implementation

---

## TL;DR

**What:** Users can pay subscriptions in $SOL, $SKR, $LUTRII, $USDC, or $USD1. System auto-swaps to merchant's preferred token (default: $USDC).

**Why:** Better UX (users pay with what they have), more adoption (not limited to stablecoin holders), $LUTRII utility (burn for discounts).

**Cost:** $70k-105k development, 16 weeks timeline

**Risk:** Medium-High complexity, Jupiter dependency, token launch execution

---

## Supported Tokens

| Token | Symbol | Mint Address | Use Case |
|-------|--------|--------------|----------|
| Solana | $SOL | So11111...TDt1v | Most liquid, users already have |
| Seeker | $SKR | [TBD] | Solana Mobile ecosystem token |
| Lutrii | $LUTRII | [To create] | Native token, burn for discounts |
| USD Coin | $USDC | EPjFWd...TDt1v | Default settlement, most stable |
| USD1 | $USD1 | [TBD] | WLFI stablecoin alternative |

---

## User Flow (Simple)

1. User selects payment token (e.g., $SOL)
2. Merchant settles in $USDC (default)
3. System quotes swap: "0.5 SOL → $50 USDC"
4. User approves
5. Jupiter swaps SOL → USDC
6. Platform fee deducted (2.5% = $1.25)
7. Merchant receives $48.75 USDC

**Total time:** ~3 seconds

---

## Fee Structure

### Base Fees (Before Discount)

| Merchant Tier | Fee % | Example on $100 |
|--------------|-------|-----------------|
| Verified | 2.5% | $2.50 |
| Community | 1.5% | $1.50 |
| Premium | 0.5% | $0.50 |

**Fee Caps:**
- Minimum: $0.01 USDC
- Maximum: $0.50 USDC

### With $LUTRII Burn Discount

| Merchant Tier | Discounted Fee | Savings |
|--------------|---------------|---------|
| Verified | 2.0% | 20% off |
| Community | 1.2% | 20% off |
| Premium | 0.4% | 20% off |

**Burn requirement:** 100 $LUTRII tokens per subscription
**Discount duration:** 90 days

---

## Fee Distribution (After Collection)

```
Platform Fee = 100%
├── 60% → Dev Wallet (immediate payment, covers operations)
├── 30% → LP Provision (adds liquidity to $LUTRII/$USDC pool)
└── 10% → Marketing (user acquisition, partnerships)
```

**Example:**
- Platform fee collected: $10,000 USDC
- Dev wallet: $6,000
- LP provision: $3,000 (added to $LUTRII/$USDC pool)
- Marketing: $1,000

---

## $LUTRII Tokenomics

### Supply & Distribution

| Allocation | Amount | % | Vesting |
|-----------|--------|---|---------|
| Team & Founders | 20M | 20% | 2 years linear |
| Early Investors | 15M | 15% | 1y cliff + 1y linear |
| Community Rewards | 25M | 25% | Staking/incentives |
| Liquidity (LP) | 20M | 20% | Locked 6 months |
| Treasury | 15M | 15% | DAO-controlled |
| Bug Bounty | 5M | 5% | On-demand |
| **Total** | **100M** | **100%** | |

### Launch Plan

**Phase 1: Initial Liquidity**
- Create $LUTRII/$USDC pool: 10M $LUTRII + 100k $USDC
- Initial price: **$0.01**
- Lock LP tokens: 6 months

**Phase 2: Fair Launch**
- Sell 10M $LUTRII @ **$0.015** (50% premium)
- Raise: $150k USDC
- Use: 50% LP, 50% treasury

**Phase 3: Incentives**
- Staking rewards: 25M over 2 years
- New subscriber bonus: 100 $LUTRII (first 50k subs)
- Verified merchant bonus: 1,000 $LUTRII (first 5k merchants)

---

## Burn Mechanism (Deflationary)

### Why Burn?

**User benefit:** 20% discount on platform fees (saves $6-12/year per subscription)

**Token benefit:** Deflationary pressure increases scarcity and value

### Burn Rate Projections

| Active Subs | % Burning | Monthly Burn | Annual Burn |
|------------|-----------|--------------|-------------|
| 10,000 | 50% | 500k LUTRII | 6M (6%) |
| 50,000 | 50% | 2.5M LUTRII | 30M (30%) |
| 100,000 | 50% | 5M LUTRII | 60M (60%) |

**Example:** At 50k subs with 50% burn rate, **30M tokens burned in Year 1** (30% of supply).

---

## Jupiter Integration

### Why Jupiter?

✅ **Best prices** - Aggregates all DEXs (Orca, Raydium, Lifinity)
✅ **High liquidity** - Routes through deepest pools
✅ **CPI-friendly** - Designed for program composability
✅ **Battle-tested** - Billions in volume, proven reliability

### Slippage Protection

- **Max slippage:** 1% (adjustable)
- **Validation:** Compare swap output to oracle price (Pyth)
- **Failure handling:** Reject transaction if slippage exceeded

**Example:**
- Expected: 0.5 SOL → $50 USDC
- Min accepted: $49.50 USDC (1% slippage)
- Actual: $49.75 USDC ✅ (0.5% slippage)

---

## Implementation Timeline

### Phase 1: Smart Contracts (Weeks 1-6)
- **Week 1-2:** Merchant token preferences
- **Week 3-4:** Multi-token subscription support
- **Week 5-6:** Fee distribution & burn discount

### Phase 2: Jupiter Integration (Weeks 7-9)
- **Week 7:** Jupiter CPI integration
- **Week 8-9:** Testing & optimization

### Phase 3: Token Launch (Weeks 10-12)
- **Week 10:** Create $LUTRII token
- **Week 11:** LP provision
- **Week 12:** Fair launch

### Phase 4: Mobile App (Weeks 10-13)
- **Week 10-11:** Token picker UI
- **Week 12-13:** Burn discount UI

### Phase 5: Testing & Security (Weeks 14-16)
- **Week 14:** Devnet testing
- **Week 15:** Security audit
- **Week 16:** Mainnet launch

**Total:** 16 weeks, $70k-105k budget

---

## Key Decisions & Rationale

### Decision 1: Default to $USDC for merchant settlement

**Why?**
- Most liquid stablecoin on Solana
- Merchants want stable, predictable income
- Easy to convert to fiat via Coinbase, Kraken

**Alternative considered:** Default to merchant's native currency (e.g., USD1)
**Why rejected:** Lower liquidity, less merchant familiarity

---

### Decision 2: 60/30/10 fee split (dev/LP/marketing)

**Why?**
- 60% dev: Covers operations, competitive with other platforms
- 30% LP: Ensures $LUTRII liquidity, sustainable token economy
- 10% marketing: User acquisition, partnerships

**Alternative considered:** 50/40/10 (more to LP)
**Why rejected:** Need more runway for dev operations

---

### Decision 3: 100 $LUTRII burn for 20% discount

**Why?**
- Economic incentive: ~$6-12 annual savings for $1 burn (at $0.01 price)
- Significant enough to drive adoption
- Simple round number (100 tokens)

**Alternative considered:** Dynamic burn based on subscription amount
**Why rejected:** Too complex for users to understand

---

### Decision 4: 90-day discount expiration

**Why?**
- Encourages re-engagement (users return to burn more)
- Prevents indefinite discounts (need recurring burns for deflation)
- Long enough to provide value (3 months of savings)

**Alternative considered:** Permanent discount
**Why rejected:** No recurring burns = no deflationary pressure

---

### Decision 5: Max 5 accepted tokens per merchant

**Why?**
- Prevents choice overload for users
- Simplifies smart contract logic
- Most merchants will use 1-2 anyway (USDC + maybe their own token)

**Alternative considered:** Unlimited tokens
**Why rejected:** Increases compute units, rarely needed

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Jupiter downtime | Medium | High | Fallback to Orca direct swap |
| Slippage attacks | Low | Medium | 1% max slippage + oracle validation |
| LP manipulation | Low | High | Monitor pool health, circuit breakers |
| Swap failures | Medium | Low | Retry logic, clear error messages |

### Economic Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| $LUTRII price crash | High | Medium | Strong burn incentives, staking rewards |
| Low burn adoption | Medium | Medium | Marketing, education, better incentives |
| High swap costs | Medium | Low | Route optimization, batch transactions |
| Liquidity fragmentation | Low | Medium | Focus on 2 main pools (USDC, SOL) |

### Regulatory Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| $LUTRII as security | Low | Critical | Legal opinion, utility focus (not investment) |
| Money transmitter | Very Low | High | Already non-custodial (exempt) |
| Tax reporting | High | Low | Provide CSV export, user education |

---

## Success Metrics (6 Months Post-Launch)

### Adoption Metrics

| Metric | Target | Ambitious |
|--------|--------|-----------|
| Total subscriptions | 10,000 | 25,000 |
| Multi-token usage | 30% | 50% |
| $LUTRII burn rate | 20% | 40% |
| Verified merchants | 500 | 1,000 |

### Economic Metrics

| Metric | Target | Ambitious |
|--------|--------|-----------|
| Platform fees collected | $20k/month | $50k/month |
| $LUTRII market cap | $500k | $1M+ |
| $LUTRII price | $0.05 | $0.10+ |
| LP pool TVL | $200k | $500k |

### Technical Metrics

| Metric | Target | Ambitious |
|--------|--------|-----------|
| Avg swap time | <3 seconds | <2 seconds |
| Swap success rate | 98% | 99.5% |
| Avg slippage | <0.5% | <0.3% |
| Payment failures | <2% | <1% |

---

## Quick FAQ

**Q: What if user's token isn't accepted by merchant?**
A: Token picker only shows tokens merchant accepts. If merchant only takes USDC, user must have USDC or one of the accepted alternatives.

**Q: Who pays for swap fees?**
A: User pays (included in total transaction). Platform fee is separate.

**Q: Can merchants accept $LUTRII directly?**
A: Yes! Merchants can add $LUTRII to accepted tokens and settle in it.

**Q: What if Jupiter is down?**
A: Fallback to direct Orca swap (may have worse rates). Eventually support multiple aggregators.

**Q: How often can users burn for discounts?**
A: Anytime. Discount renews for another 90 days with each burn.

**Q: Can users burn for multiple subscriptions?**
A: No. Each burn applies to one specific subscription. Must burn separately for each.

**Q: What happens to burned tokens?**
A: Sent to null address (permanently removed from circulation).

**Q: Will you add more tokens later?**
A: Yes! Starting with 5, will add merchant-specific tokens (e.g., Fartcoin for Fartcoin merchants).

---

## Comparison to Competitors

| Feature | Lutrii | Zebec | Streamflow | Mean Finance |
|---------|--------|-------|------------|--------------|
| Multi-token payments | ✅ 5 tokens | ❌ USDC only | ❌ Single token | ✅ Limited |
| Auto-swap | ✅ Jupiter | ❌ | ❌ | ✅ |
| Native token | ✅ $LUTRII | ✅ $ZBC | ❌ | ❌ |
| Burn discounts | ✅ 20% off | ❌ | ❌ | ❌ |
| Fee distribution to LP | ✅ 30% | ❌ | ❌ | ❌ |
| Merchant token choice | ✅ | ❌ | ❌ | ❌ |
| Privacy-first | ✅ A+ | ⚠️ C | ⚠️ C | ⚠️ B |
| Solana Mobile | ✅ Native | ❌ Web | ❌ Web | ❌ Web |

**Competitive advantage:** Only platform with multi-token + auto-swap + burn discounts + privacy-first + Solana Mobile.

---

## Developer Checklist

### Before Starting

- [ ] Review TOKEN_ECONOMICS_ARCHITECTURE.md
- [ ] Review MULTI_TOKEN_IMPLEMENTATION_PLAN.md
- [ ] Set up Jupiter testnet account
- [ ] Create $LUTRII test token on devnet
- [ ] Allocate $70k-105k budget
- [ ] Hire Solana engineer (16 weeks)

### Phase 1 Complete When:

- [ ] Merchants can set settlement_token
- [ ] Merchants can set accepted_tokens
- [ ] Subscriptions have payment_token field
- [ ] Fee distribution working (60/30/10)
- [ ] Burn discount implemented
- [ ] 25+ tests passing
- [ ] All docs updated

### Launch Ready When:

- [ ] All 5 tokens supported
- [ ] Jupiter swaps working
- [ ] $LUTRII token launched
- [ ] LP pools funded
- [ ] Mobile app updated
- [ ] Security audit passed
- [ ] All tests passing (100+ tests)
- [ ] Mainnet deployment successful

---

## Appendix: Links

### Documentation

- [Full Architecture](/docs/TOKEN_ECONOMICS_ARCHITECTURE.md)
- [Implementation Plan](/docs/MULTI_TOKEN_IMPLEMENTATION_PLAN.md)
- [Liability Protection](/docs/LIABILITY_PROTECTION_SUMMARY.md)
- [Privacy Architecture](/docs/PRIVACY_ARCHITECTURE.md)

### External Resources

- [Jupiter Documentation](https://docs.jup.ag/)
- [Orca SDK](https://docs.orca.so/)
- [SPL Token Program](https://spl.solana.com/token)
- [Anchor Framework](https://www.anchor-lang.com/)

### Service Providers

- **Security Audits:** Sec3, OtterSec, Neodyme
- **Bug Bounty:** Immunefi, HackerOne
- **DEX Listing:** Jupiter, Orca, Raydium
- **Token Tracking:** CoinGecko, CoinMarketCap

---

**Created:** 2026-02-11
**Status:** REFERENCE GUIDE
**Next Action:** Review architecture, approve plan, begin development

