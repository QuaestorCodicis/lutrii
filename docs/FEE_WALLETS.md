# Fee Collection Wallets

**Generated:** 2026-02-12
**Status:** Devnet & Mainnet Ready
**Purpose:** Phase 1 fee collection for USDC and USD1 stablecoins

---

## Wallet Details

### USDC Fee Wallet
```
Public Key:  CvMuPf2fZvCnXyV51Pd3ok19QkuLwbkZyzeTv8bY8CyR
Keypair:     ./keypairs/fee-wallet-usdc.json (NEVER commit!)
Purpose:     Receives all USDC platform fees
Network:     Devnet & Mainnet (same keypair)
```

### USD1 Fee Wallet
```
Public Key:  HEYEj2GAdmb2N1bAevgPx3KjKHTSrZRK9dEw39SFzMMN
Keypair:     ./keypairs/fee-wallet-usd1.json (NEVER commit!)
Purpose:     Receives all USD1 platform fees
Network:     Devnet & Mainnet (same keypair)
```

---

## Security

### ✅ Protected
- Both keypair files are in `.gitignore`
- Keypairs stored locally in `./keypairs/` directory
- Directory excluded from version control
- Public keys safe to share (used in smart contracts)

### ⚠️ CRITICAL
- **NEVER commit keypair files to git**
- **NEVER share private keys or seed phrases**
- **Backup seed phrases in secure location (password manager, hardware wallet)**
- **These wallets will hold real funds on mainnet**

### 🔐 Backup Seed Phrases

**IMPORTANT:** Store these seed phrases securely. If you lose access to the keypair files, you can recover using these phrases.

**USDC Wallet Seed:**
```
index hospital warfare predict adult try tag powder snack champion egg pumpkin
```

**USD1 Wallet Seed:**
```
mom jaguar post wise bring near picnic until assume subject pulse execute
```

**Recommended backup locations:**
- Hardware wallet (Ledger/Trezor)
- Password manager (1Password, Bitwarden)
- Physical backup in secure location
- **DO NOT** store in cloud services or unencrypted files

---

## Setup Instructions

### 1. Fund Wallets (Devnet)

Before deploying to devnet, fund wallets with SOL for rent:

```bash
# Fund USDC fee wallet
solana airdrop 1 CvMuPf2fZvCnXyV51Pd3ok19QkuLwbkZyzeTv8bY8CyR --url devnet

# Fund USD1 fee wallet
solana airdrop 1 HEYEj2GAdmb2N1bAevgPx3KjKHTSrZRK9dEw39SFzMMN --url devnet
```

### 2. Create Token Accounts

The smart contract will automatically create associated token accounts (ATAs) for USDC and USD1 when needed. No manual action required.

### 3. Verify Wallets

```bash
# Check USDC wallet balance
solana balance CvMuPf2fZvCnXyV51Pd3ok19QkuLwbkZyzeTv8bY8CyR --url devnet

# Check USD1 wallet balance
solana balance HEYEj2GAdmb2N1bAevgPx3KjKHTSrZRK9dEw39SFzMMN --url devnet
```

---

## Integration with Smart Contracts

These public keys will be hardcoded into the `PlatformConfig` account during initialization:

```rust
pub struct PlatformConfig {
    pub authority: Pubkey,              // Admin wallet
    pub fee_wallet_usdc: Pubkey,        // CvMuPf2fZvCnXyV51Pd3ok19QkuLwbkZyzeTv8bY8CyR
    pub fee_wallet_usd1: Pubkey,        // HEYEj2GAdmb2N1bAevgPx3KjKHTSrZRK9dEw39SFzMMN
    pub bump: u8,

    // Reserved for Phase 3 automated splitting
    pub reserved1: Pubkey,              // Future: operations_wallet (60%)
    pub reserved2: Pubkey,              // Future: lp_provision_wallet (30%)
    pub reserved3: Pubkey,              // Future: marketing_wallet (10%)
    pub reserved4: u8,                  // Future: split_enabled flag
}
```

### Initialization Command (Example)

```bash
# Initialize platform config with fee wallets
anchor run initialize-platform \
  --provider.cluster devnet \
  --provider.wallet ~/.config/solana/id.json \
  -- \
  --fee-wallet-usdc CvMuPf2fZvCnXyV51Pd3ok19QkuLwbkZyzeTv8bY8CyR \
  --fee-wallet-usd1 HEYEj2GAdmb2N1bAevgPx3KjKHTSrZRK9dEw39SFzMMN
```

---

## Fee Collection Flow

### Phase 1 (Current)
1. User pays subscription in any accepted token (SOL, USDC, USD1, SKR)
2. If payment token ≠ merchant's settlement token, Jupiter swap executed
3. Platform fee (1.5% base) collected in settlement token (USDC or USD1)
4. Fee transferred to corresponding fee wallet:
   - USDC fees → `CvMuPf2fZvCnXyV51Pd3ok19QkuLwbkZyzeTv8bY8CyR`
   - USD1 fees → `HEYEj2GAdmb2N1bAevgPx3KjKHTSrZRK9dEw39SFzMMN`
5. Manual allocation: 50% ops, 30% growth, 20% reserve

### Phase 3 (Future)
- Automated splitting to 3 wallets (60/30/10)
- LP provision for $LUTRII token
- Treasury management
- Marketing wallet funding

---

## Monitoring & Withdrawals

### Check Fee Earnings

```bash
# USDC fee wallet token balance
spl-token balance --owner CvMuPf2fZvCnXyV51Pd3ok19QkuLwbkZyzeTv8bY8CyR --url devnet

# USD1 fee wallet token balance
spl-token balance --owner HEYEj2GAdmb2N1bAevgPx3KjKHTSrZRK9dEw39SFzMMN --url devnet
```

### Withdraw Fees

```bash
# Transfer USDC fees to operations wallet
spl-token transfer \
  --owner ./keypairs/fee-wallet-usdc.json \
  4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU \
  <amount> \
  <destination-wallet> \
  --url devnet

# Transfer USD1 fees to operations wallet
spl-token transfer \
  --owner ./keypairs/fee-wallet-usd1.json \
  <USD1-mint-address> \
  <amount> \
  <destination-wallet> \
  --url devnet
```

---

## Capital Allocation Strategy

See [FEE_COLLECTION_STRATEGY.md](/docs/FEE_COLLECTION_STRATEGY.md) for full details.

**Phase 1 Manual Allocation:**
- **50% Operations:** Servers, RPC, infrastructure, salaries
- **30% Growth:** Marketing, partnerships, bounties, grants
- **20% Reserve:** Token launch fund ($10k-15k needed)

**Monthly Projections:**
- Month 6: $720/month (1,800 subs × $0.40)
- Month 12: $4,000/month (10,000 subs × $0.40)
- Year 1 Total: $16,660 revenue

---

## Migration to Mainnet

When deploying to mainnet:

1. ✅ Use same keypairs (already generated)
2. Fund wallets with SOL for rent (~0.1 SOL each)
3. Update `PlatformConfig` with same public keys
4. Test with small transactions first
5. Monitor fee collection continuously
6. Set up automated monitoring/alerts

**No new wallets needed** - these keypairs work on all Solana clusters (devnet, testnet, mainnet).

---

## Emergency Procedures

### Lost Keypair Access
1. Recover using seed phrases (stored securely)
2. Import to Phantom/Solflare: Settings → Import Wallet → Seed Phrase
3. Export private key and recreate keypair JSON

### Compromised Wallet
1. **Immediately** transfer all funds to new secure wallet
2. Generate new fee wallets using `solana-keygen new`
3. Update `PlatformConfig` via admin authority
4. Deploy updated configuration to mainnet
5. Revoke access to compromised keypair

### Wallet Rotation (Planned)
- Not required for Phase 1
- Can be implemented via `update_platform_config` instruction
- Requires admin signature
- Zero downtime (atomic update)

---

## Checklist

### Devnet Deployment
- [ ] Fund USDC fee wallet (0.1 SOL)
- [ ] Fund USD1 fee wallet (0.1 SOL)
- [ ] Verify wallets funded
- [ ] Initialize PlatformConfig with fee wallet pubkeys
- [ ] Test fee collection with sample subscription
- [ ] Verify fees arrive in correct wallets

### Mainnet Deployment
- [ ] Backup seed phrases in 3 secure locations
- [ ] Fund USDC fee wallet (0.5 SOL minimum)
- [ ] Fund USD1 fee wallet (0.5 SOL minimum)
- [ ] Initialize PlatformConfig with fee wallet pubkeys
- [ ] Test with minimum subscription first
- [ ] Monitor fee collection for 24 hours
- [ ] Set up automated balance monitoring
- [ ] Document withdrawal procedures for team

---

**Last Updated:** 2026-02-12
**Next Review:** Before mainnet deployment
