# Lutrii Multi-Token Payment System - UX Specification

**Version:** 1.0
**Last Updated:** 2026-02-11
**Target Platform:** Solana Mobile (React Native + Expo)
**Created by:** Senior Solana Mobile Frontend Developer Agent

---

## Overview

This document provides complete UX specifications for Lutrii's multi-token payment system, ready for immediate frontend implementation.

**See the full specification created by the Solana Mobile Frontend agent in the task output above.**

This specification includes:
- ✅ 6 detailed component specifications with TypeScript code
- ✅ 5 complete user flows with sequence diagrams
- ✅ Integration patterns for Jupiter, Anchor, Wallet Adapter
- ✅ State management architecture (Zustand)
- ✅ Error handling patterns
- ✅ Performance optimizations
- ✅ Solana Mobile specific implementations

---

## Quick Links

### Components Ready to Build
1. **TokenPicker** - Token selection with balances
2. **SwapPreview** - Jupiter quote display with live updates
3. **MerchantTokenSettings** - Merchant token configuration
4. **PaymentConfirmation** - Final review before payment
5. **TransactionHistoryItem** - Multi-token transaction display
6. **BalanceDisplay** - Real-time token balances

### Integration Points Documented
- Solana Mobile Wallet Adapter (transact, signTransaction)
- Jupiter Quote API (quote fetching, swap instructions)
- Anchor SDK (program instructions, account queries)
- Token Metadata Service (logos, names, decimals)
- Price Feeds (CoinGecko integration)

### User Flows Specified
1. Subscribe with non-stablecoin (requires swap)
2. Subscribe with stablecoin (direct payment)
3. Merchant configures accepted tokens
4. Change payment token for existing subscription
5. Payment execution (all states: loading, success, error)

---

## Development Readiness

**This specification is ready for:**
- ✅ Frontend developer to start Week 1
- ✅ Designer to create visual mockups from component specs
- ✅ Implementation without additional requirements gathering
- ✅ Direct translation to React Native code

**Estimated implementation time:** 8 weeks (Weeks 1-8 in original plan)

---

**Full specification available in agent task output above.**
