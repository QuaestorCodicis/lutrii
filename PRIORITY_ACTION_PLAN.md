# Lutrii Priority Action Plan
**Goal:** Secure Production Deployment on Solana Mobile Seeker
**Timeline:** 9-12 weeks to production-ready
**Current Status:** 70% ready → Target: 90%+

---

## 🚨 WEEK 1: Critical Security Fixes (12 hours)

### DAY 1-2: Smart Contract Reentrancy (4 hours)
**File:** `programs/lutrii-recurring/src/lib.rs`

1. Add to Subscription struct (line 777):
```rust
pub payment_in_progress: bool,  // Reentrancy guard
```

2. Update `execute_payment` function (lines 181-323) to follow CEI pattern:
```rust
pub fn execute_payment(ctx: Context<ExecutePayment>) -> Result<()> {
    let subscription = &mut ctx.accounts.subscription;

    // CHECKS
    require!(!subscription.payment_in_progress, ErrorCode::PaymentInProgress);
    require!(subscription.is_active, ErrorCode::SubscriptionNotActive);
    // ... other checks

    // EFFECTS (state updates BEFORE transfers)
    subscription.payment_in_progress = true;
    subscription.last_payment = clock.unix_timestamp;
    subscription.next_payment = clock.unix_timestamp + subscription.frequency_seconds;
    subscription.total_paid = subscription.total_paid.checked_add(amount)?;
    subscription.payment_count += 1;

    // INTERACTIONS (transfers AFTER state updates)
    transfer_checked(...)?;
    if fee > 0 { transfer_checked(...)?; }

    subscription.payment_in_progress = false;
    Ok(())
}
```

3. Add error code:
```rust
#[error_code]
pub enum ErrorCode {
    // ... existing errors
    #[msg("Payment already in progress")]
    PaymentInProgress,
}
```

**Test:** Add reentrancy test to `tests/lutrii-recurring.ts`

---

### DAY 2-3: Mobile Storage Encryption (2 hours)
**File:** `mobile/src/utils/storage.ts`

1. Install dependency (if not already):
```bash
cd mobile && yarn add react-native-keychain
```

2. Replace entire `storage.ts`:
```typescript
import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import { randomBytes } from 'react-native-randombytes';

const SERVICE_NAME = 'lutrii-storage-encryption';

async function getOrCreateEncryptionKey(): Promise<string> {
    try {
        const credentials = await Keychain.getGenericPassword({
            service: SERVICE_NAME,
        });

        if (credentials) {
            return credentials.password;
        }

        // Generate unique key
        const keyBytes = await new Promise<Uint8Array>((resolve, reject) => {
            randomBytes(32, (error, bytes) => {
                if (error) reject(error);
                else resolve(bytes);
            });
        });

        const key = Buffer.from(keyBytes).toString('base64');

        await Keychain.setGenericPassword('encryption', key, {
            service: SERVICE_NAME,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
            securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
        });

        return key;
    } catch (error) {
        console.error('Encryption key generation failed:', error);
        throw new Error('Storage initialization failed');
    }
}

let storageInstance: MMKV | null = null;

export async function initializeStorage(): Promise<MMKV> {
    if (storageInstance) return storageInstance;

    const encryptionKey = await getOrCreateEncryptionKey();

    storageInstance = new MMKV({
        id: 'lutrii-storage',
        encryptionKey: encryptionKey,  // ✅ Device-unique!
    });

    return storageInstance;
}

export function getStorage(): MMKV {
    if (!storageInstance) {
        throw new Error('Storage not initialized. Call initializeStorage() first.');
    }
    return storageInstance;
}
```

3. Update `App.tsx` to initialize storage on startup:
```typescript
useEffect(() => {
    async function initialize() {
        await initializeStorage();
        // ... rest of initialization
    }
    initialize();
}, []);
```

---

### DAY 3-4: Transaction Simulation (3 hours)
**File:** `mobile/src/services/walletService.ts`

Add before line 221:
```typescript
private async simulateTransaction(
    transaction: Transaction | VersionedTransaction
): Promise<void> {
    const connection = getConnection();

    try {
        const simulation = await connection.simulateTransaction(
            transaction,
            { commitment: 'processed' }
        );

        if (simulation.value.err) {
            throw new Error(
                `Transaction will fail: ${this.parseSimulationError(simulation.value.err)}`
            );
        }

        const computeUnits = simulation.value.unitsConsumed || 0;
        if (computeUnits > 1_400_000) {
            throw new Error('Transaction exceeds compute limit');
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes('Transaction will fail')) {
            throw error;
        }
        throw new Error('Unable to verify transaction. Please try again.');
    }
}

private parseSimulationError(error: any): string {
    const errorStr = JSON.stringify(error);

    if (errorStr.includes('InsufficientFunds')) {
        return 'Insufficient SOL for transaction fees';
    }
    if (errorStr.includes('AccountNotFound')) {
        return 'Token account not initialized';
    }
    if (errorStr.includes('custom program error: 0x1')) {
        return 'Subscription is not active';
    }

    return `Error: ${errorStr}`;
}
```

Update `signAndSendTransaction` (line 221):
```typescript
async signAndSendTransaction(
    transaction: Transaction | VersionedTransaction
): Promise<string> {
    // ✅ Simulate first
    await this.simulateTransaction(transaction);

    // Then sign and send
    const signature = await transact(async (wallet: Web3MobileWallet) => {
        // ... existing code
    });

    return signature;
}
```

---

### DAY 4-5: CPI Validation Fix (3 hours)
**File:** `programs/lutrii-merchant-registry/src/lib.rs`

1. Update `RecordTransaction` struct (lines 575-580):
```rust
#[derive(Accounts)]
pub struct RecordTransaction<'info> {
    /// CHECK: Validated via instruction introspection
    pub recurring_program: UncheckedAccount<'info>,

    /// CHECK: Solana instructions sysvar for CPI validation
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,

    // ... rest of accounts
}
```

2. Update `record_transaction` function (add at start):
```rust
use solana_program::sysvar::instructions::{load_current_index, load_instruction_at_checked};

pub fn record_transaction(ctx: Context<RecordTransaction>, ...) -> Result<()> {
    // Verify called via CPI
    let ixs = ctx.accounts.instructions.to_account_info();
    let current_index = load_current_index(&ixs)?;

    require!(current_index > 0, ErrorCode::MustBeCalledViaCpi);

    let parent_ix = load_instruction_at_checked(
        (current_index - 1) as usize,
        &ixs
    )?;

    require!(
        parent_ix.program_id == lutrii_recurring::ID,
        ErrorCode::UnauthorizedCpiCaller
    );

    // ... rest of function
}
```

3. Add error codes:
```rust
#[msg("Must be called via CPI")]
MustBeCalledViaCpi,
#[msg("Not a valid program")]
NotAProgram,
```

---

## 🟠 WEEK 2: High Priority Fixes (16 hours)

### Merchant Validation (4 hours)
**File:** `programs/lutrii-recurring/src/lib.rs:608`

Update `CreateSubscription` accounts:
```rust
#[account(
    seeds = [b"merchant", merchant.key().as_ref()],
    bump,
    seeds::program = MERCHANT_REGISTRY_PROGRAM_ID,
    constraint = merchant_account.is_verified @ ErrorCode::MerchantNotVerified,
    constraint = merchant_account.status == MerchantStatus::Active,
)]
pub merchant_account: Account<'info, MerchantRegistry>,
```

### Review Sybil Resistance (2 hours)
**File:** `programs/lutrii-merchant-registry/src/lib.rs:606-617`

Update constraints:
```rust
constraint = subscription.payment_count >= 3,
constraint = subscription.total_paid >= 1_000_000,  // 1 USDC minimum
constraint = clock.unix_timestamp - subscription.created_at >= 604_800,  // 7 days
```

### Complete Transaction Building (6 hours)
**Files:** `mobile/src/services/blockchainService.ts`

Implement all TODOs:
- Load IDLs
- Complete `createSubscription` (line 111)
- Complete `executePayment` (line 197)
- Complete other transaction builders

### Comprehensive Testing (4 hours)
**File:** `tests/lutrii-recurring.ts`

Add tests:
```typescript
describe("Security Tests", () => {
    it("prevents reentrancy", async () => { /* test code */ });
    it("validates merchant", async () => { /* test code */ });
    it("handles concurrent payments", async () => { /* test code */ });
});
```

---

## 🟡 WEEK 3: Medium Priority & Testing (20 hours)

### Add Multi-Sig Support (8 hours)
Integrate Squads Protocol for admin functions

### Token Extension Support (6 hours)
Add handling for Token-2022 extensions

### Rate Limiting (2 hours)
Implement wallet adapter rate limiting

### Full Test Suite (4 hours)
- Token-2022 extension tests
- Concurrent execution tests
- Edge case coverage

---

## 📋 WEEKS 4-10: Audit & Launch Prep

### Week 4-5: Pre-Audit Preparation
- [ ] Code freeze for audit
- [ ] Documentation complete
- [ ] Testnet deployment
- [ ] Beta user testing

### Week 6-9: External Security Audit
- [ ] Smart contract audit (OtterSec recommended)
- [ ] Mobile app security review
- [ ] Fix all audit findings
- [ ] Re-audit if critical issues found

### Week 10: Production Deployment
- [ ] Mainnet program deployment
- [ ] Mobile app store submission
- [ ] Gradual rollout (volume limits)
- [ ] 24/7 monitoring active

---

## 🎯 Success Metrics

### Security
- ✅ 0 critical vulnerabilities
- ✅ 0 high vulnerabilities
- ✅ External audit passed
- ✅ 95%+ test coverage

### Performance
- ✅ < 500ms transaction build time
- ✅ < 2s end-to-end payment time
- ✅ 99.9% transaction success rate

### Solana Mobile Seeker
- ✅ Seed Vault integration (optional but recommended)
- ✅ NFC support for merchant subscriptions
- ✅ Optimal battery usage
- ✅ Offline transaction preparation

---

## 💰 Budget Estimate

| Item | Cost | Duration |
|------|------|----------|
| Developer time (160 hrs @ $150/hr) | $24,000 | 3 weeks |
| External audit (OtterSec) | $40,000 | 6 weeks |
| Beta testing rewards | $5,000 | 2 weeks |
| App store fees | $200 | 1 week |
| **Total** | **$69,200** | **12 weeks** |

---

## 🚀 Quick Start Today

**Highest ROI first 8 hours:**

1. **Hour 1-2:** Fix reentrancy vulnerability
2. **Hour 3-4:** Replace encryption key
3. **Hour 5-6:** Add transaction simulation
4. **Hour 7-8:** Write critical tests

After these 8 hours, you'll have addressed the 4 critical vulnerabilities and can proceed with confidence to the remaining improvements.

---

## 📞 Next Steps

1. Review `SECURITY_AUDIT_REPORT.md` for full technical details
2. Start with Week 1 critical fixes (commit to branch: `security-fixes-week1`)
3. Schedule external audit consultation
4. Plan Seeker beta testing program

**Questions?** Review the security audit report or reach out for clarification on any fixes.

---

**Created:** 2026-02-09
**Status:** Ready for implementation
**Priority Level:** 🔴 CRITICAL
