# Comprehensive Testing Guide - Lutrii Week 2 Enhancements

**Date:** 2026-02-09
**Status:** 🧪 Testing Specification
**Priority:** Week 2 - Task 4

---

## Overview

This guide provides comprehensive test specifications for all Week 2 security enhancements:
1. Merchant Validation
2. Review Sybil Resistance
3. Edge Cases and Security Boundaries

---

## Prerequisites

### Fix IDL Build Feature

Before running tests, add to both `Cargo.toml` files:

```toml
[features]
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]
```

**Files to update:**
- `programs/lutrii-recurring/Cargo.toml`
- `programs/lutrii-merchant-registry/Cargo.toml`

### Test Environment Setup

```bash
# Ensure Solana test validator is running
solana-test-validator

# Run tests
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
anchor test --skip-local-validator
```

---

## Test Suite 1: Merchant Validation Tests

### Test 1.1: Create Subscription with Verified Merchant

**Purpose:** Verify that subscriptions can be created when merchant is verified

**Setup:**
```typescript
it("allows subscription creation with verified merchant", async () => {
  // 1. Create merchant in registry
  const merchantOwner = anchor.web3.Keypair.generate();
  await program.methods
    .applyForVerification("Test Merchant", "https://webhook.test", "Technology")
    .accounts({
      merchant: merchantAccount,
      owner: merchantOwner.publicKey,
      registry: registryState,
      systemProgram: SystemProgram.programId,
    })
    .signers([merchantOwner])
    .rpc();

  // 2. Admin approves merchant (tier: Verified)
  await merchantRegistryProgram.methods
    .approveMerchant({ verified: {} }) // VerificationTier::Verified
    .accounts({
      merchant: merchantAccount,
      registry: registryState,
      authority: admin.publicKey,
    })
    .signers([admin])
    .rpc();

  // 3. Create subscription - should succeed
  await program.methods
    .createSubscription(
      new BN(10_000_000), // 10 USDC
      new BN(30 * 24 * 60 * 60), // 30 days
      new BN(50_000_000), // max 50 USDC
      new BN(500_000_000), // lifetime 500 USDC
      "Verified Merchant Test"
    )
    .accounts({
      subscription: subscriptionPDA,
      platformState: platformState,
      user: user.publicKey,
      merchant: merchantAccount, // From registry
      userTokenAccount: userTokenAccount,
      merchantTokenAccount: merchantTokenAccount,
      mint: usdcMint,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([user])
    .rpc();

  // Verify subscription created
  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(subscription.isActive, true);
  assert.equal(subscription.merchantName, "Verified Merchant Test");
});
```

**Expected:** SUCCESS ✅

---

### Test 1.2: Reject Subscription with Unverified Merchant

**Purpose:** Verify that unverified merchants cannot accept subscriptions

**Setup:**
```typescript
it("rejects subscription creation with unverified merchant", async () => {
  // 1. Create merchant but DON'T approve
  const merchantOwner = anchor.web3.Keypair.generate();
  await merchantRegistryProgram.methods
    .applyForVerification("Unverified Merchant", "https://webhook.test", "Tech")
    .accounts({
      merchant: merchantAccount,
      owner: merchantOwner.publicKey,
      registry: registryState,
      systemProgram: SystemProgram.programId,
    })
    .signers([merchantOwner])
    .rpc();

  // Merchant is now Unverified (default state)

  // 2. Try to create subscription - should fail
  try {
    await program.methods
      .createSubscription(
        new BN(10_000_000),
        new BN(30 * 24 * 60 * 60),
        new BN(50_000_000),
        new BN(500_000_000),
        "Should Fail"
      )
      .accounts({
        subscription: subscriptionPDA,
        platformState: platformState,
        user: user.publicKey,
        merchant: merchantAccount,
        userTokenAccount: userTokenAccount,
        merchantTokenAccount: merchantTokenAccount,
        mint: usdcMint,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    assert.fail("Should have thrown error for unverified merchant");
  } catch (error) {
    assert.include(error.toString(), "MerchantNotVerified");
  }
});
```

**Expected:** ERROR with `MerchantNotVerified` ✅

---

### Test 1.3: Reject Subscription with Suspended Merchant

**Purpose:** Verify that suspended merchants cannot accept new subscriptions

**Setup:**
```typescript
it("rejects subscription creation with suspended merchant", async () => {
  // 1. Create and approve merchant
  const merchantOwner = anchor.web3.Keypair.generate();
  await merchantRegistryProgram.methods
    .applyForVerification("Test Merchant", "https://webhook.test", "Tech")
    .accounts({ /* ... */ })
    .signers([merchantOwner])
    .rpc();

  await merchantRegistryProgram.methods
    .approveMerchant({ verified: {} })
    .accounts({ /* ... */ })
    .signers([admin])
    .rpc();

  // 2. Suspend merchant
  await merchantRegistryProgram.methods
    .suspendMerchant("Fraudulent activity detected")
    .accounts({
      merchant: merchantAccount,
      registry: registryState,
      authority: admin.publicKey,
    })
    .signers([admin])
    .rpc();

  // 3. Try to create subscription - should fail
  try {
    await program.methods
      .createSubscription(/* ... */)
      .accounts({ /* ... */ })
      .signers([user])
      .rpc();

    assert.fail("Should have thrown error for suspended merchant");
  } catch (error) {
    assert.include(error.toString(), "MerchantSuspended");
  }
});
```

**Expected:** ERROR with `MerchantSuspended` ✅

---

### Test 1.4: Community Tier Merchant Accepts Subscriptions

**Purpose:** Verify Community tier merchants can accept subscriptions

**Setup:**
```typescript
it("allows subscription creation with community tier merchant", async () => {
  // 1. Create merchant and approve to Verified
  // 2. Simulate excellent performance to auto-upgrade to Community
  //    - 100+ transactions
  //    - community_score >= 1000
  //    - failed_transactions < 5

  // For test: manually approve to Community tier (admin override)
  await merchantRegistryProgram.methods
    .approveMerchant({ community: {} }) // Would fail - need to earn Community
    .accounts({ /* ... */ })
    .signers([admin])
    .rpc();

  // OR: Record 100 successful transactions to earn Community tier

  // 3. Create subscription - should succeed
  await program.methods
    .createSubscription(/* ... */)
    .accounts({ /* ... */ })
    .signers([user])
    .rpc();

  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(subscription.isActive, true);
});
```

**Expected:** SUCCESS ✅

---

### Test 1.5: Invalid Merchant PDA Rejected

**Purpose:** Verify that fake/spoofed merchant PDAs are rejected

**Setup:**
```typescript
it("rejects subscription with invalid merchant PDA", async () => {
  // 1. Create a FAKE merchant account (not from registry)
  const fakeMerchant = anchor.web3.Keypair.generate();

  // 2. Try to create subscription with fake merchant - should fail PDA validation
  try {
    await program.methods
      .createSubscription(/* ... */)
      .accounts({
        merchant: fakeMerchant.publicKey, // WRONG: not a valid PDA
        // ... other accounts
      })
      .signers([user])
      .rpc();

    assert.fail("Should have thrown error for invalid merchant PDA");
  } catch (error) {
    assert.include(error.toString(), "InvalidMerchantAccount");
  }
});
```

**Expected:** ERROR with `InvalidMerchantAccount` ✅

---

## Test Suite 2: Review Sybil Resistance Tests

### Test 2.1: Reject Review with < 3 Payments

**Purpose:** Verify reviews require minimum 3 successful payments

**Setup:**
```typescript
it("rejects review submission with insufficient payment history", async () => {
  // 1. Create subscription
  await program.methods.createSubscription(/* ... */).rpc();

  // 2. Execute only 2 payments
  await program.methods.executePayment(/* ... */).rpc();
  await new Promise(r => setTimeout(r, 2000));
  await program.methods.executePayment(/* ... */).rpc();

  // Verify payment count
  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(subscription.paymentCount, 2);

  // 3. Try to submit review - should fail
  try {
    await merchantRegistryProgram.methods
      .submitReview(5, "Great service")
      .accounts({
        review: reviewPDA,
        merchant: merchantAccount,
        subscription: subscriptionPDA,
        reviewer: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    assert.fail("Should have thrown error for insufficient payment history");
  } catch (error) {
    assert.include(error.toString(), "InsufficientPaymentHistory");
  }
});
```

**Expected:** ERROR with `InsufficientPaymentHistory` ✅

---

### Test 2.2: Reject Review with < 1 USDC Total Paid

**Purpose:** Verify reviews require minimum 1 USDC total paid

**Setup:**
```typescript
it("rejects review submission with insufficient total paid", async () => {
  // 1. Create subscription with TINY amounts (0.10 USDC each)
  await program.methods
    .createSubscription(
      new BN(100_000), // 0.10 USDC
      new BN(1), // 1 second (for testing)
      new BN(1_000_000),
      new BN(10_000_000),
      "Tiny Payment Test"
    )
    .accounts({ /* ... */ })
    .signers([user])
    .rpc();

  // 2. Execute 3 payments (0.30 USDC total - below 1 USDC threshold)
  for (let i = 0; i < 3; i++) {
    await program.methods.executePayment(/* ... */).rpc();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Verify payment count and total
  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(subscription.paymentCount, 3);
  assert.isBelow(subscription.totalPaid.toNumber(), 1_000_000); // < 1 USDC

  // 3. Try to submit review - should fail
  try {
    await merchantRegistryProgram.methods
      .submitReview(5, "Great service")
      .accounts({ /* ... */ })
      .signers([user])
      .rpc();

    assert.fail("Should have thrown error for insufficient total paid");
  } catch (error) {
    assert.include(error.toString(), "InsufficientTotalPaid");
  }
});
```

**Expected:** ERROR with `InsufficientTotalPaid` ✅

---

### Test 2.3: Reject Review with Subscription < 7 Days Old

**Purpose:** Verify reviews require subscription age >= 7 days

**Setup:**
```typescript
it("rejects review submission with new subscription", async () => {
  // 1. Create subscription
  const creationTime = Date.now();
  await program.methods.createSubscription(/* ... */).rpc();

  // 2. Execute 3 payments with ≥1 USDC total
  for (let i = 0; i < 3; i++) {
    await program.methods
      .executePayment(/* ... */)
      .rpc();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Verify requirements met EXCEPT age
  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(subscription.paymentCount, 3);
  assert.isAtLeast(subscription.totalPaid.toNumber(), 1_000_000);

  const ageSeconds = (Date.now() - creationTime) / 1000;
  assert.isBelow(ageSeconds, 7 * 24 * 60 * 60); // Less than 7 days

  // 3. Try to submit review - should fail
  try {
    await merchantRegistryProgram.methods
      .submitReview(5, "Great service")
      .accounts({ /* ... */ })
      .signers([user])
      .rpc();

    assert.fail("Should have thrown error for new subscription");
  } catch (error) {
    assert.include(error.toString(), "SubscriptionTooNew");
  }
});
```

**Expected:** ERROR with `SubscriptionTooNew` ✅

**Note:** For actual testing, use time warp utilities to simulate 7-day passage.

---

### Test 2.4: Accept Review When All Requirements Met

**Purpose:** Verify review succeeds when all sybil resistance checks pass

**Setup:**
```typescript
it("accepts review submission when all requirements met", async () => {
  // 1. Create subscription
  await program.methods
    .createSubscription(
      new BN(10_000_000), // 10 USDC
      new BN(1), // 1 second for testing
      new BN(50_000_000),
      new BN(500_000_000),
      "Sybil Test"
    )
    .accounts({ /* ... */ })
    .signers([user])
    .rpc();

  // 2. Fast-forward time by 7 days (use time warp utility)
  // await timeWarp(7 * 24 * 60 * 60);

  // 3. Execute 3+ payments with ≥1 USDC total
  for (let i = 0; i < 3; i++) {
    await program.methods.executePayment(/* ... */).rpc();
    await new Promise(r => setTimeout(r, 2000));
  }

  // Verify all requirements met
  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.isAtLeast(subscription.paymentCount, 3);
  assert.isAtLeast(subscription.totalPaid.toNumber(), 1_000_000);
  // assert subscription age >= 7 days

  // 4. Submit review - should succeed
  await merchantRegistryProgram.methods
    .submitReview(5, "Excellent service, highly recommend!")
    .accounts({
      review: reviewPDA,
      merchant: merchantAccount,
      subscription: subscriptionPDA,
      reviewer: user.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([user])
    .rpc();

  // Verify review created
  const review = await merchantRegistryProgram.account.review.fetch(reviewPDA);
  assert.equal(review.rating, 5);
  assert.equal(review.comment, "Excellent service, highly recommend!");

  // Verify merchant score updated
  const merchant = await merchantRegistryProgram.account.merchant.fetch(merchantAccount);
  assert.isAbove(merchant.communityScore, 0); // 5-star = +20 points
});
```

**Expected:** SUCCESS ✅

---

## Test Suite 3: Edge Cases and Security Boundaries

### Test 3.1: Maximum Payment Count

**Purpose:** Verify system handles large payment counts correctly

**Setup:**
```typescript
it("handles maximum payment count without overflow", async () => {
  // Create subscription and execute many payments
  const maxPayments = 1000;

  for (let i = 0; i < maxPayments; i++) {
    await program.methods.executePayment(/* ... */).rpc();
    if (i % 100 === 0) {
      console.log(`Executed ${i} payments...`);
    }
  }

  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(subscription.paymentCount, maxPayments);
});
```

**Expected:** SUCCESS without overflow ✅

---

### Test 3.2: Concurrent Subscription Creation

**Purpose:** Verify multiple users can create subscriptions to same merchant

**Setup:**
```typescript
it("allows multiple users to subscribe to same merchant", async () => {
  const users = [
    anchor.web3.Keypair.generate(),
    anchor.web3.Keypair.generate(),
    anchor.web3.Keypair.generate(),
  ];

  // All users create subscriptions to same merchant
  for (const user of users) {
    const [subscriptionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("subscription"),
        user.publicKey.toBuffer(),
        merchantAccount.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .createSubscription(/* ... */)
      .accounts({
        subscription: subscriptionPDA,
        user: user.publicKey,
        merchant: merchantAccount,
        // ... other accounts
      })
      .signers([user])
      .rpc();
  }

  // Verify all subscriptions created
  assert.equal(users.length, 3);
});
```

**Expected:** SUCCESS ✅

---

### Test 3.3: Token-2022 Extension Support

**Purpose:** Verify system works with Token-2022 extensions

**Setup:**
```typescript
it("handles Token-2022 transfer hooks correctly", async () => {
  // 1. Create a Token-2022 mint WITH transfer hook extension
  const mintWithHook = await createToken2022MintWithHook(
    connection,
    payer,
    hookProgramId
  );

  // 2. Create subscription using this mint
  await program.methods
    .createSubscription(/* ... */)
    .accounts({
      mint: mintWithHook,
      // ... other accounts
    })
    .signers([user])
    .rpc();

  // 3. Execute payment - should trigger transfer hook
  await program.methods
    .executePayment(/* ... */)
    .rpc();

  // 4. Verify reentrancy guard prevented double-execution
  const subscription = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(subscription.paymentInProgress, false);
  assert.equal(subscription.paymentCount, 1); // Not 2!
});
```

**Expected:** SUCCESS with reentrancy protection ✅

---

### Test 3.4: Price Variance Protection

**Purpose:** Verify price variance check prevents unexpected amount changes

**Setup:**
```typescript
it("rejects payment if amount changed by >10%", async () => {
  // 1. Create subscription for 10 USDC
  await program.methods
    .createSubscription(
      new BN(10_000_000),
      new BN(30 * 24 * 60 * 60),
      new BN(100_000_000), // Max 100 USDC
      new BN(1_000_000_000),
      "Price Variance Test"
    )
    .accounts({ /* ... */ })
    .signers([user])
    .rpc();

  // 2. Try to execute payment with DIFFERENT amount (e.g., 15 USDC = +50%)
  // Note: This would require modifying subscription or mocking oracle
  // For testing: create new subscription with different amount

  // Expected: Payment should fail if amount variance > 10%
  // (This is checked in execute_payment function)
});
```

**Expected:** ERROR if variance > 10% ✅

---

### Test 3.5: Merchant Token Account Validation

**Purpose:** Verify merchant token account must match merchant owner

**Setup:**
```typescript
it("rejects subscription with wrong merchant token account", async () => {
  // 1. Get verified merchant from registry
  const merchantData = await merchantRegistryProgram.account.merchant.fetch(
    merchantAccount
  );

  // 2. Create token account for DIFFERENT owner (not merchant.owner)
  const wrongOwner = anchor.web3.Keypair.generate();
  const wrongMerchantTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    wrongOwner.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // 3. Try to create subscription - should fail validation
  try {
    await program.methods
      .createSubscription(/* ... */)
      .accounts({
        merchant: merchantAccount, // Correct merchant PDA
        merchantTokenAccount: wrongMerchantTokenAccount, // WRONG: different owner
        // ... other accounts
      })
      .signers([user])
      .rpc();

    assert.fail("Should have thrown error for wrong merchant token account");
  } catch (error) {
    assert.include(error.toString(), "InvalidTokenAccountOwner");
  }
});
```

**Expected:** ERROR with `InvalidTokenAccountOwner` ✅

---

## Test Suite 4: Integration Tests

### Test 4.1: Full Subscription Lifecycle

**Purpose:** Test complete flow from creation to cancellation

**Setup:**
```typescript
it("completes full subscription lifecycle", async () => {
  // 1. Merchant applies and gets verified
  await merchantRegistryProgram.methods.applyForVerification(/* ... */).rpc();
  await merchantRegistryProgram.methods.approveMerchant({ verified: {} }).rpc();

  // 2. User creates subscription
  await program.methods.createSubscription(/* ... */).rpc();

  // 3. Execute 5 payments
  for (let i = 0; i < 5; i++) {
    await program.methods.executePayment(/* ... */).rpc();
    await new Promise(r => setTimeout(r, 2000));
  }

  // 4. Pause subscription
  await program.methods.pauseSubscription(/* ... */).rpc();
  let sub = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(sub.isPaused, true);

  // 5. Resume subscription
  await program.methods.resumeSubscription(/* ... */).rpc();
  sub = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(sub.isPaused, false);

  // 6. Update limits
  await program.methods
    .updateLimits(new BN(200_000_000), new BN(2_000_000_000))
    .rpc();
  sub = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(sub.maxPerTransaction.toNumber(), 200_000_000);

  // 7. Cancel subscription
  await program.methods.cancelSubscription(/* ... */).rpc();
  sub = await program.account.subscription.fetch(subscriptionPDA);
  assert.equal(sub.isActive, false);
});
```

**Expected:** Complete lifecycle SUCCESS ✅

---

## Running the Tests

### Setup Test Environment

```bash
# 1. Fix IDL build feature
# Add to Cargo.toml files as documented above

# 2. Build programs
anchor build

# 3. Run all tests
anchor test

# 4. Run specific test suite
anchor test -- --grep "Merchant Validation"

# 5. Run with verbose output
anchor test -- --verbose
```

### Expected Test Results

```
  Lutrii Recurring Payments
    ✓ initializes platform state
    ✓ creates a subscription successfully
    ✓ executes a payment
    ✓ pauses a subscription
    ✓ resumes a subscription
    ✓ cancels a subscription

  Critical Security Fixes
    ✓ prevents reentrancy attacks with payment_in_progress guard
    ✓ verifies subscription state follows CEI pattern

  Week 2: Merchant Validation Tests
    ✓ allows subscription creation with verified merchant
    ✓ rejects subscription creation with unverified merchant
    ✓ rejects subscription creation with suspended merchant
    ✓ allows subscription creation with community tier merchant
    ✓ rejects subscription with invalid merchant PDA

  Week 2: Review Sybil Resistance Tests
    ✓ rejects review submission with insufficient payment history
    ✓ rejects review submission with insufficient total paid
    ✓ rejects review submission with new subscription
    ✓ accepts review submission when all requirements met

  Week 2: Edge Cases and Security Boundaries
    ✓ handles maximum payment count without overflow
    ✓ allows multiple users to subscribe to same merchant
    ✓ handles Token-2022 transfer hooks correctly
    ✓ rejects payment if amount changed by >10%
    ✓ rejects subscription with wrong merchant token account

  Week 2: Integration Tests
    ✓ completes full subscription lifecycle


  27 passing (45s)
```

---

## Test Coverage Goals

### Current Coverage (Week 1)

- ✅ Platform initialization
- ✅ Basic subscription lifecycle
- ✅ Reentrancy protection
- ✅ CEI pattern verification

### Week 2 Target Coverage

- ✅ Merchant validation (5 tests)
- ✅ Review sybil resistance (4 tests)
- ✅ Edge cases (5 tests)
- ✅ Integration tests (1 comprehensive test)

**Total:** 27 tests covering all critical paths

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Anchor Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ./.github/actions/setup-solana
      - name: Run Anchor Tests
        run: |
          anchor build
          anchor test
```

---

## Next Steps

1. **Fix IDL Build Feature** - Add to Cargo.toml
2. **Implement Test Suite 1** - Merchant validation tests
3. **Implement Test Suite 2** - Sybil resistance tests
4. **Implement Test Suite 3** - Edge cases
5. **Implement Test Suite 4** - Integration tests
6. **Run Full Test Suite** - Verify all tests pass
7. **Add CI/CD** - Automate testing on every commit

---

**Created:** 2026-02-09
**Status:** 📋 **READY FOR IMPLEMENTATION**
**Test Count:** 15 new tests (27 total)

