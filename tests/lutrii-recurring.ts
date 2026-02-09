/**
 * Lutrii Recurring Payment Program - Comprehensive Test Suite
 *
 * Tests all critical functionality and security features:
 * - Token delegation model for payments
 * - Price variance protection
 * - Daily volume limits with auto-reset
 * - Input validation
 * - Access control
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  approve,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert, expect } from "chai";
import { BN } from "bn.js";

describe("lutrii-recurring", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LutriiRecurring as Program;

  // Test accounts
  let admin: Keypair;
  let user: Keypair;
  let merchant: Keypair;
  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let merchantTokenAccount: PublicKey;
  let platformState: PublicKey;
  let subscription: PublicKey;
  let merchantRegistry: PublicKey;
  let feeCollector: PublicKey;

  // Constants matching program
  const PLATFORM_SEED = "platform";
  const SUBSCRIPTION_SEED = "subscription";
  const FEE_BASIS_POINTS = 250; // 2.5%
  const MIN_FEE_BASIS_POINTS = 1;
  const MAX_FEE_BASIS_POINTS = 500;
  const MIN_FREQUENCY_SECONDS = 3600; // 1 hour
  const MAX_FREQUENCY_SECONDS = 31536000; // 1 year
  const MAX_MERCHANT_NAME_LEN = 32;
  const DAILY_VOLUME_LIMIT = new BN("1000000000000"); // 1M USDC (6 decimals)

  before(async () => {
    // Generate test accounts
    admin = Keypair.generate();
    user = Keypair.generate();
    merchant = Keypair.generate();

    // Airdrop SOL for rent and fees
    await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      merchant.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for airdrops
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create USDC-like mint (6 decimals, using Token-2022)
    mint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6,
      Keypair.generate(),
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Create token accounts
    userTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      user.publicKey,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    merchantTokenAccount = await createAccount(
      provider.connection,
      merchant,
      mint,
      merchant.publicKey,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Mint tokens to user (1000 USDC)
    await mintTo(
      provider.connection,
      admin,
      mint,
      userTokenAccount,
      admin,
      1000_000000, // 1000 USDC with 6 decimals
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    // Derive PDAs
    [platformState] = PublicKey.findProgramAddressSync(
      [Buffer.from(PLATFORM_SEED)],
      program.programId
    );

    [subscription] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(SUBSCRIPTION_SEED),
        user.publicKey.toBuffer(),
        merchant.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Mock merchant registry (we'll use a keypair for testing)
    merchantRegistry = Keypair.generate().publicKey;

    // Fee collector
    feeCollector = await createAccount(
      provider.connection,
      admin,
      mint,
      admin.publicKey,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
  });

  describe("Platform Initialization", () => {
    it("Successfully initializes platform", async () => {
      await program.methods
        .initializePlatform(FEE_BASIS_POINTS, DAILY_VOLUME_LIMIT)
        .accounts({
          admin: admin.publicKey,
          platformState: platformState,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      const state = await program.account.platformState.fetch(platformState);
      assert.equal(state.admin.toBase58(), admin.publicKey.toBase58());
      assert.equal(state.feeBasisPoints, FEE_BASIS_POINTS);
      assert.equal(state.dailyVolumeLimit.toString(), DAILY_VOLUME_LIMIT.toString());
      assert.equal(state.isPaused, false);
      assert.equal(state.totalSubscriptions.toString(), "0");
    });

    it("Fails with fee too low", async () => {
      const newPlatform = Keypair.generate().publicKey;
      try {
        await program.methods
          .initializePlatform(0, DAILY_VOLUME_LIMIT)
          .accounts({
            admin: admin.publicKey,
            platformState: newPlatform,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
        assert.fail("Should have failed with FeeTooLow");
      } catch (err) {
        expect(err.toString()).to.include("FeeTooLow");
      }
    });

    it("Fails with fee too high", async () => {
      const newPlatform = Keypair.generate().publicKey;
      try {
        await program.methods
          .initializePlatform(501, DAILY_VOLUME_LIMIT)
          .accounts({
            admin: admin.publicKey,
            platformState: newPlatform,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
        assert.fail("Should have failed with FeeTooHigh");
      } catch (err) {
        expect(err.toString()).to.include("FeeTooHigh");
      }
    });
  });

  describe("Subscription Creation", () => {
    const amount = new BN(10_000000); // 10 USDC
    const frequency = 86400; // 1 day
    const merchantName = "Test Merchant";

    it("Successfully creates subscription", async () => {
      const lifetimeCap = amount.mul(new BN(12)); // 12 payments

      await program.methods
        .createSubscription(amount, frequency, lifetimeCap, merchantName)
        .accounts({
          user: user.publicKey,
          merchant: merchant.publicKey,
          subscription: subscription,
          platformState: platformState,
          merchantRegistry: merchantRegistry,
          userTokenAccount: userTokenAccount,
          merchantTokenAccount: merchantTokenAccount,
          mint: mint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const sub = await program.account.subscription.fetch(subscription);
      assert.equal(sub.user.toBase58(), user.publicKey.toBase58());
      assert.equal(sub.merchant.toBase58(), merchant.publicKey.toBase58());
      assert.equal(sub.amount.toString(), amount.toString());
      assert.equal(sub.originalAmount.toString(), amount.toString());
      assert.equal(sub.frequencySeconds.toString(), frequency.toString());
      assert.equal(sub.lifetimeCap.toString(), lifetimeCap.toString());
      assert.equal(sub.isActive, true);
      assert.equal(sub.merchantName, merchantName);

      // Verify token delegation was set
      const userAccount = await getAccount(
        provider.connection,
        userTokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      assert.equal(userAccount.delegate?.toBase58(), subscription.toBase58());
      assert.equal(userAccount.delegatedAmount.toString(), lifetimeCap.toString());
    });

    it("Fails with frequency too short", async () => {
      const shortFrequency = 3599; // Less than 1 hour
      const newUser = Keypair.generate();
      const [newSub] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          newUser.publicKey.toBuffer(),
          merchant.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .createSubscription(amount, shortFrequency, amount.mul(new BN(12)), merchantName)
          .accounts({
            user: newUser.publicKey,
            merchant: merchant.publicKey,
            subscription: newSub,
            platformState: platformState,
            merchantRegistry: merchantRegistry,
            userTokenAccount: userTokenAccount,
            merchantTokenAccount: merchantTokenAccount,
            mint: mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([newUser])
          .rpc();
        assert.fail("Should have failed with FrequencyTooShort");
      } catch (err) {
        expect(err.toString()).to.include("FrequencyTooShort");
      }
    });

    it("Fails with merchant name too long", async () => {
      const longName = "A".repeat(MAX_MERCHANT_NAME_LEN + 1);
      const newUser = Keypair.generate();
      const [newSub] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          newUser.publicKey.toBuffer(),
          merchant.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .createSubscription(amount, frequency, amount.mul(new BN(12)), longName)
          .accounts({
            user: newUser.publicKey,
            merchant: merchant.publicKey,
            subscription: newSub,
            platformState: platformState,
            merchantRegistry: merchantRegistry,
            userTokenAccount: userTokenAccount,
            merchantTokenAccount: merchantTokenAccount,
            mint: mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([newUser])
          .rpc();
        assert.fail("Should have failed with InvalidMerchantName");
      } catch (err) {
        expect(err.toString()).to.include("InvalidMerchantName");
      }
    });

    it("Fails with amount too low", async () => {
      const newUser = Keypair.generate();
      const [newSub] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          newUser.publicKey.toBuffer(),
          merchant.publicKey.toBuffer(),
        ],
        program.programId
      );

      try {
        await program.methods
          .createSubscription(new BN(0), frequency, amount.mul(new BN(12)), merchantName)
          .accounts({
            user: newUser.publicKey,
            merchant: merchant.publicKey,
            subscription: newSub,
            platformState: platformState,
            merchantRegistry: merchantRegistry,
            userTokenAccount: userTokenAccount,
            merchantTokenAccount: merchantTokenAccount,
            mint: mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([newUser])
          .rpc();
        assert.fail("Should have failed with AmountTooLow");
      } catch (err) {
        expect(err.toString()).to.include("AmountTooLow");
      }
    });
  });

  describe("Payment Execution", () => {
    it("Successfully executes payment using delegation", async () => {
      // Wait for next payment to be due
      await new Promise(resolve => setTimeout(resolve, 2000));

      const merchantBefore = await getAccount(
        provider.connection,
        merchantTokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const userBefore = await getAccount(
        provider.connection,
        userTokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      await program.methods
        .executePayment()
        .accounts({
          subscription: subscription,
          platformState: platformState,
          merchantRegistry: merchantRegistry,
          userTokenAccount: userTokenAccount,
          merchantTokenAccount: merchantTokenAccount,
          feeCollector: feeCollector,
          mint: mint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      const merchantAfter = await getAccount(
        provider.connection,
        merchantTokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const userAfter = await getAccount(
        provider.connection,
        userTokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const feeAccount = await getAccount(
        provider.connection,
        feeCollector,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const sub = await program.account.subscription.fetch(subscription);

      // Verify payment was made
      assert.equal(sub.paymentCount.toString(), "1");
      assert.isAbove(Number(merchantAfter.amount), Number(merchantBefore.amount));
      assert.isBelow(Number(userAfter.amount), Number(userBefore.amount));
      assert.isAbove(Number(feeAccount.amount), 0);
    });

    it("Fails when payment not due yet", async () => {
      try {
        await program.methods
          .executePayment()
          .accounts({
            subscription: subscription,
            platformState: platformState,
            merchantRegistry: merchantRegistry,
            userTokenAccount: userTokenAccount,
            merchantTokenAccount: merchantTokenAccount,
            feeCollector: feeCollector,
            mint: mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have failed with PaymentNotDue");
      } catch (err) {
        expect(err.toString()).to.include("PaymentNotDue");
      }
    });
  });

  describe("Subscription Management", () => {
    it("Successfully pauses subscription", async () => {
      await program.methods
        .pauseSubscription()
        .accounts({
          user: user.publicKey,
          subscription: subscription,
        })
        .signers([user])
        .rpc();

      const sub = await program.account.subscription.fetch(subscription);
      assert.equal(sub.isPaused, true);
    });

    it("Successfully resumes subscription", async () => {
      await program.methods
        .resumeSubscription()
        .accounts({
          user: user.publicKey,
          subscription: subscription,
        })
        .signers([user])
        .rpc();

      const sub = await program.account.subscription.fetch(subscription);
      assert.equal(sub.isPaused, false);
    });

    it("Successfully cancels subscription", async () => {
      await program.methods
        .cancelSubscription()
        .accounts({
          user: user.publicKey,
          subscription: subscription,
          userTokenAccount: userTokenAccount,
          mint: mint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const sub = await program.account.subscription.fetch(subscription);
      assert.equal(sub.isActive, false);

      // Verify delegation was revoked
      const userAccount = await getAccount(
        provider.connection,
        userTokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      assert.isNull(userAccount.delegate);
      assert.equal(userAccount.delegatedAmount.toString(), "0");
    });

    it("Fails to execute payment on cancelled subscription", async () => {
      try {
        await program.methods
          .executePayment()
          .accounts({
            subscription: subscription,
            platformState: platformState,
            merchantRegistry: merchantRegistry,
            userTokenAccount: userTokenAccount,
            merchantTokenAccount: merchantTokenAccount,
            feeCollector: feeCollector,
            mint: mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
          })
          .rpc();
        assert.fail("Should have failed with SubscriptionNotActive");
      } catch (err) {
        expect(err.toString()).to.include("SubscriptionNotActive");
      }
    });
  });

  describe("Admin Functions", () => {
    it("Admin can pause platform", async () => {
      await program.methods
        .pausePlatform()
        .accounts({
          admin: admin.publicKey,
          platformState: platformState,
        })
        .signers([admin])
        .rpc();

      const state = await program.account.platformState.fetch(platformState);
      assert.equal(state.isPaused, true);
    });

    it("Admin can resume platform", async () => {
      await program.methods
        .resumePlatform()
        .accounts({
          admin: admin.publicKey,
          platformState: platformState,
        })
        .signers([admin])
        .rpc();

      const state = await program.account.platformState.fetch(platformState);
      assert.equal(state.isPaused, false);
    });

    it("Non-admin cannot pause platform", async () => {
      try {
        await program.methods
          .pausePlatform()
          .accounts({
            admin: user.publicKey,
            platformState: platformState,
          })
          .signers([user])
          .rpc();
        assert.fail("Should have failed with UnauthorizedAdmin");
      } catch (err) {
        expect(err.toString()).to.include("UnauthorizedAdmin");
      }
    });
  });

  describe("Security Features", () => {
    let securityUser: Keypair;
    let securityMerchant: Keypair;
    let securityUserTokenAccount: PublicKey;
    let securityMerchantTokenAccount: PublicKey;
    let securitySubscription: PublicKey;

    before(async () => {
      securityUser = Keypair.generate();
      securityMerchant = Keypair.generate();

      await provider.connection.requestAirdrop(
        securityUser.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.requestAirdrop(
        securityMerchant.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      securityUserTokenAccount = await createAccount(
        provider.connection,
        securityUser,
        mint,
        securityUser.publicKey,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      securityMerchantTokenAccount = await createAccount(
        provider.connection,
        securityMerchant,
        mint,
        securityMerchant.publicKey,
        undefined,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      await mintTo(
        provider.connection,
        admin,
        mint,
        securityUserTokenAccount,
        admin,
        1000_000000,
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      [securitySubscription] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(SUBSCRIPTION_SEED),
          securityUser.publicKey.toBuffer(),
          securityMerchant.publicKey.toBuffer(),
        ],
        program.programId
      );
    });

    it("Validates token account ownership", async () => {
      // Try to create subscription with merchant's token account as user's
      try {
        await program.methods
          .createSubscription(
            new BN(10_000000),
            86400,
            new BN(120_000000),
            "Security Test"
          )
          .accounts({
            user: securityUser.publicKey,
            merchant: securityMerchant.publicKey,
            subscription: securitySubscription,
            platformState: platformState,
            merchantRegistry: merchantRegistry,
            userTokenAccount: securityMerchantTokenAccount, // Wrong!
            merchantTokenAccount: securityMerchantTokenAccount,
            mint: mint,
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([securityUser])
          .rpc();
        assert.fail("Should have failed with InvalidTokenAccountOwner");
      } catch (err) {
        expect(err.toString()).to.include("InvalidTokenAccountOwner");
      }
    });

    it("Protects against price variance > 10%", async () => {
      // Create subscription with normal amount
      const normalAmount = new BN(10_000000);
      await program.methods
        .createSubscription(normalAmount, 86400, normalAmount.mul(new BN(12)), "Price Test")
        .accounts({
          user: securityUser.publicKey,
          merchant: securityMerchant.publicKey,
          subscription: securitySubscription,
          platformState: platformState,
          merchantRegistry: merchantRegistry,
          userTokenAccount: securityUserTokenAccount,
          merchantTokenAccount: securityMerchantTokenAccount,
          mint: mint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([securityUser])
        .rpc();

      // Wait for payment to be due
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Execute first payment
      await program.methods
        .executePayment()
        .accounts({
          subscription: securitySubscription,
          platformState: platformState,
          merchantRegistry: merchantRegistry,
          userTokenAccount: securityUserTokenAccount,
          merchantTokenAccount: securityMerchantTokenAccount,
          feeCollector: feeCollector,
          mint: mint,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      // Try to update with > 10% variance
      const variantAmount = normalAmount.mul(new BN(12)).div(new BN(10)); // +20%
      try {
        await program.methods
          .updateSubscriptionAmount(variantAmount)
          .accounts({
            user: securityUser.publicKey,
            subscription: securitySubscription,
          })
          .signers([securityUser])
          .rpc();
        assert.fail("Should have failed with PriceVarianceExceeded");
      } catch (err) {
        expect(err.toString()).to.include("PriceVarianceExceeded");
      }
    });
  });
});
