# Transaction Building Guide - Lutrii Mobile SDK

**Date:** 2026-02-09
**Status:** 🔧 Implementation Guide
**Priority:** Week 2 - Task 3

---

## Overview

This guide provides complete implementation details for building Solana transactions in the Lutrii mobile app to interact with the recurring payments smart contracts.

---

## Prerequisites

### Required Dependencies

Add to `mobile/package.json`:

```json
{
  "dependencies": {
    "@coral-xyz/borsh": "^0.30.1",
    "@solana/web3.js": "^1.87.0",
    "@solana/spl-token": "^0.4.0"
  }
}
```

Install:
```bash
cd mobile
npm install @coral-xyz/borsh
```

---

## Instruction Discriminators

Anchor programs use 8-byte discriminators derived from `sha256("global:<method_name>")[:8]`.

### Lutrii Recurring Program

```typescript
import { sha256 } from '@noble/hashes/sha256';

function getMethodDiscriminator(name: string): Buffer {
  return Buffer.from(sha256(`global:${name}`)).slice(0, 8);
}

const DISCRIMINATORS = {
  createSubscription: getMethodDiscriminator('create_subscription'),
  pauseSubscription: getMethodDiscriminator('pause_subscription'),
  resumeSubscription: getMethodDiscriminator('resume_subscription'),
  cancelSubscription: getMethodsDiscriminator('cancel_subscription'),
  executePayment: getMethodDiscriminator('execute_payment'),
  updateLimits: getMethodDiscriminator('update_limits'),
};
```

---

## 1. Create Subscription Transaction

### Required Accounts

```typescript
interface CreateSubscriptionAccounts {
  subscription: PublicKey;      // PDA: ['subscription', user, merchant]
  platformState: PublicKey;      // PDA: ['platform']
  user: PublicKey;               // Signer
  merchant: PublicKey;           // Merchant from registry (AccountInfo)
  userTokenAccount: PublicKey;   // User's USDC ATA
  merchantTokenAccount: PublicKey; // Merchant owner's USDC ATA
  mint: PublicKey;               // USDC mint
  tokenProgram: PublicKey;       // TOKEN_2022_PROGRAM_ID
  systemProgram: PublicKey;      // SystemProgram.programId
}
```

### Instruction Data

```typescript
import * as borsh from '@coral-xyz/borsh';

const createSubscriptionSchema = borsh.struct([
  borsh.u64('amount'),
  borsh.i64('frequencySeconds'),
  borsh.u64('maxPerTransaction'),
  borsh.u64('lifetimeCap'),
  borsh.str('merchantName'),
]);

function serializeCreateSubscription(params: {
  amount: number;
  frequencySeconds: number;
  maxPerTransaction: number;
  lifetimeCap: number;
  merchantName: string;
}): Buffer {
  const discriminator = DISCRIMINATORS.createSubscription;

  const data = Buffer.alloc(1000); // Allocate enough space
  createSubscriptionSchema.encode(params, data);

  return Buffer.concat([discriminator, data]);
}
```

### Complete Implementation

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<string> {
  const userPublicKey = walletService.getPublicKey();
  if (!userPublicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    const merchantOwnerPubkey = new PublicKey(params.merchantPublicKey);
    const amountLamports = Math.floor(params.amount * 1_000_000); // USDC has 6 decimals
    const frequencySeconds = params.frequencyDays * 24 * 60 * 60;
    const maxPerTransaction = params.maxPerTransaction
      ? Math.floor(params.maxPerTransaction * 1_000_000)
      : amountLamports * 2;
    const lifetimeCap = params.lifetimeCap
      ? Math.floor(params.lifetimeCap * 1_000_000)
      : amountLamports * 100;

    // Derive merchant account PDA from merchant registry
    const [merchantAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from('merchant'), merchantOwnerPubkey.toBuffer()],
      LUTRII_MERCHANT_REGISTRY_PROGRAM_ID
    );

    // Derive platform state PDA
    const [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from('platform')],
      LUTRII_RECURRING_PROGRAM_ID
    );

    // Derive subscription PDA
    const [subscription] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('subscription'),
        userPublicKey.toBuffer(),
        merchantOwnerPubkey.toBuffer(),
      ],
      LUTRII_RECURRING_PROGRAM_ID
    );

    // Get token accounts
    const userTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      userPublicKey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const merchantTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      merchantOwnerPubkey,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Serialize instruction data
    const data = serializeCreateSubscription({
      amount: amountLamports,
      frequencySeconds,
      maxPerTransaction,
      lifetimeCap,
      merchantName: params.merchantName,
    });

    // Build instruction
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: subscription, isSigner: false, isWritable: true },
        { pubkey: platformState, isSigner: false, isWritable: true },
        { pubkey: userPublicKey, isSigner: true, isWritable: true },
        { pubkey: merchantAccount, isSigner: false, isWritable: false },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: merchantTokenAccount, isSigner: false, isWritable: true },
        { pubkey: USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: LUTRII_RECURRING_PROGRAM_ID,
      data,
    });

    // Build and send transaction
    const tx = new Transaction().add(instruction);
    const signature = await walletService.signAndSendTransaction(tx);

    console.log('[BlockchainService] Subscription created:', signature);
    return signature;
  } catch (error) {
    console.error('[BlockchainService] Failed to create subscription:', error);
    throw error;
  }
}
```

---

## 2. Pause Subscription Transaction

### Instruction Data

```typescript
// No parameters needed - just discriminator
function serializePauseSubscription(): Buffer {
  return DISCRIMINATORS.pauseSubscription;
}
```

### Implementation

```typescript
async pauseSubscription(subscriptionPublicKey: string): Promise<string> {
  const userPublicKey = walletService.getPublicKey();
  if (!userPublicKey) {
    throw new Error('Wallet not connected');
  }

  const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    LUTRII_RECURRING_PROGRAM_ID
  );

  const data = serializePauseSubscription();

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: subscriptionPubkey, isSigner: false, isWritable: true },
      { pubkey: platformState, isSigner: false, isWritable: false },
      { pubkey: userPublicKey, isSigner: true, isWritable: false },
    ],
    programId: LUTRII_RECURRING_PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);
  const signature = await walletService.signAndSendTransaction(tx);

  return signature;
}
```

---

## 3. Resume Subscription Transaction

### Implementation

```typescript
async resumeSubscription(subscriptionPublicKey: string): Promise<string> {
  const userPublicKey = walletService.getPublicKey();
  if (!userPublicKey) {
    throw new Error('Wallet not connected');
  }

  const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    LUTRII_RECURRING_PROGRAM_ID
  );

  const data = DISCRIMINATORS.resumeSubscription; // No params

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: subscriptionPubkey, isSigner: false, isWritable: true },
      { pubkey: platformState, isSigner: false, isWritable: false },
      { pubkey: userPublicKey, isSigner: true, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: LUTRII_RECURRING_PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);
  return await walletService.signAndSendTransaction(tx);
}
```

---

## 4. Cancel Subscription Transaction

### Implementation

```typescript
async cancelSubscription(subscriptionPublicKey: string): Promise<string> {
  const userPublicKey = walletService.getPublicKey();
  if (!userPublicKey) {
    throw new Error('Wallet not connected');
  }

  const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    LUTRII_RECURRING_PROGRAM_ID
  );

  // Need to fetch subscription to get merchant and token accounts
  const subscription = await this.fetchSubscription(subscriptionPublicKey);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const merchantPubkey = new PublicKey(subscription.merchant);

  const userTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    userPublicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const data = DISCRIMINATORS.cancelSubscription; // No params

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: subscriptionPubkey, isSigner: false, isWritable: true },
      { pubkey: platformState, isSigner: false, isWritable: true },
      { pubkey: userPublicKey, isSigner: true, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchantPubkey, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: LUTRII_RECURRING_PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);
  return await walletService.signAndSendTransaction(tx);
}
```

---

## 5. Update Subscription Limits

### Instruction Data

```typescript
const updateLimitsSchema = borsh.struct([
  borsh.u64('maxPerTransaction'),
  borsh.u64('lifetimeCap'),
]);

function serializeUpdateLimits(params: {
  maxPerTransaction: number;
  lifetimeCap: number;
}): Buffer {
  const discriminator = DISCRIMINATORS.updateLimits;

  const data = Buffer.alloc(100);
  updateLimitsSchema.encode(params, data);

  return Buffer.concat([discriminator, data]);
}
```

### Implementation

```typescript
async updateSubscriptionLimits(
  subscriptionPublicKey: string,
  maxPerTransaction: number,
  lifetimeCap: number
): Promise<string> {
  const userPublicKey = walletService.getPublicKey();
  if (!userPublicKey) {
    throw new Error('Wallet not connected');
  }

  const subscriptionPubkey = new PublicKey(subscriptionPublicKey);
  const maxLamports = Math.floor(maxPerTransaction * 1_000_000);
  const capLamports = Math.floor(lifetimeCap * 1_000_000);

  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    LUTRII_RECURRING_PROGRAM_ID
  );

  const data = serializeUpdateLimits({
    maxPerTransaction: maxLamports,
    lifetimeCap: capLamports,
  });

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: subscriptionPubkey, isSigner: false, isWritable: true },
      { pubkey: platformState, isSigner: false, isWritable: false },
      { pubkey: userPublicKey, isSigner: true, isWritable: false },
    ],
    programId: LUTRII_RECURRING_PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);
  return await walletService.signAndSendTransaction(tx);
}
```

---

## 6. Execute Payment (Manual Trigger)

### Implementation

```typescript
async executePayment(subscriptionPublicKey: string): Promise<string> {
  const subscription = await this.fetchSubscription(subscriptionPublicKey);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const userPubkey = new PublicKey(subscription.user);
  const merchantOwnerPubkey = new PublicKey(subscription.merchant);
  const subscriptionPubkey = new PublicKey(subscriptionPublicKey);

  // Derive merchant account
  const [merchantAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('merchant'), merchantOwnerPubkey.toBuffer()],
    LUTRII_MERCHANT_REGISTRY_PROGRAM_ID
  );

  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from('platform')],
    LUTRII_RECURRING_PROGRAM_ID
  );

  // Get token accounts
  const userTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    userPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const merchantTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    merchantOwnerPubkey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const platformTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    platformState, // Platform fees go to platform state PDA
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const data = DISCRIMINATORS.executePayment; // No params

  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: subscriptionPubkey, isSigner: false, isWritable: true },
      { pubkey: platformState, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: false, isWritable: false },
      { pubkey: merchantAccount, isSigner: false, isWritable: false },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: merchantTokenAccount, isSigner: false, isWritable: true },
      { pubkey: platformTokenAccount, isSigner: false, isWritable: true },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: LUTRII_RECURRING_PROGRAM_ID,
    data,
  });

  const tx = new Transaction().add(instruction);
  return await walletService.signAndSendTransaction(tx);
}
```

---

## Testing Checklist

### Unit Tests

- [ ] Test PDA derivation matches Rust program
- [ ] Test instruction data serialization
- [ ] Test account key ordering
- [ ] Test error handling for invalid inputs

### Integration Tests

- [ ] Create subscription on devnet
- [ ] Pause subscription
- [ ] Resume subscription
- [ ] Execute manual payment
- [ ] Update limits
- [ ] Cancel subscription

### End-to-End Tests

- [ ] Full subscription lifecycle
- [ ] Multiple concurrent subscriptions
- [ ] Error scenarios (insufficient balance, etc.)
- [ ] Seed Vault integration (on Solana Mobile Seeker)

---

## Security Considerations

### Transaction Simulation

Always simulate transactions before signing (already implemented in walletService):

```typescript
await this.simulateTransaction(transaction);
```

### Merchant Validation

The smart contract now validates merchants via the registry. Ensure:
- Merchant must be verified (not Unverified or Suspended)
- Merchant PDA must match registry

### Amount Limits

- maxPerTransaction should be ≥ amount
- lifetimeCap should be ≥ amount
- Both should prevent overflow (max: 2^64 - 1)

---

## Next Steps

1. **Install Dependencies:**
   ```bash
   cd mobile
   npm install @coral-xyz/borsh @noble/hashes
   ```

2. **Implement Serialization:**
   - Create `mobile/src/utils/instruction-serialization.ts`
   - Implement discriminator generation
   - Implement borsh encoding for each instruction

3. **Update BlockchainService:**
   - Replace TODOs with implementations from this guide
   - Add proper error handling
   - Add transaction simulation

4. **Test on Devnet:**
   - Deploy programs to devnet
   - Test each transaction type
   - Verify with Solana Explorer

5. **Integration Testing:**
   - Test with Seed Vault on Solana Mobile Seeker
   - Test payment execution flow
   - Test error scenarios

---

**Created:** 2026-02-09
**Status:** 📋 **READY FOR IMPLEMENTATION**
**Priority:** Complete after installing dependencies

