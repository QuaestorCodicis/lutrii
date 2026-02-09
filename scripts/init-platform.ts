/**
 * Initialize Lutrii Platform on Devnet
 *
 * This script initializes the platform state account with admin authority
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";

const CLUSTER = "devnet";
const FEE_BASIS_POINTS = 250; // 2.5%
const DAILY_VOLUME_LIMIT = new anchor.BN("1000000000000"); // 1M USDC (6 decimals)

async function initializePlatform() {
  console.log("🔧 Initializing Lutrii Platform on", CLUSTER);
  console.log("=====================================\n");

  // Setup connection
  const connection = new anchor.web3.Connection(
    anchor.web3.clusterApiUrl(CLUSTER as any),
    "confirmed"
  );

  // Load wallet
  const walletPath = `${process.env.HOME}/.config/solana/id.json`;
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found at ${walletPath}`);
  }

  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  console.log("Admin wallet:", wallet.publicKey.toBase58());
  console.log("Cluster:", CLUSTER);

  // Load programs
  const recurringIdl = JSON.parse(
    fs.readFileSync("target/idl/lutrii_recurring.json", "utf-8")
  );
  const merchantRegistryIdl = JSON.parse(
    fs.readFileSync("target/idl/lutrii_merchant_registry.json", "utf-8")
  );

  const recurringProgram = new Program(
    recurringIdl,
    new PublicKey("146BGDDLG4yRYXfNCCDdRRmCAYTrGddCgY14n4ekxJyF"),
    provider
  );

  const merchantRegistryProgram = new Program(
    merchantRegistryIdl,
    new PublicKey("3RkcL88V6dyHRCJFyGZ54R1u1KcHqeYB24MA38894Eex"),
    provider
  );

  // Derive PDAs
  const [platformState] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    recurringProgram.programId
  );

  const [registryState] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    merchantRegistryProgram.programId
  );

  console.log("\n📍 PDAs:");
  console.log("Platform State:", platformState.toBase58());
  console.log("Registry State:", registryState.toBase58());

  // Check if already initialized
  try {
    const existingPlatform = await recurringProgram.account.platformState.fetch(
      platformState
    );
    console.log("\n⚠️  Platform already initialized");
    console.log("Admin:", existingPlatform.admin.toBase58());
    console.log("Fee:", existingPlatform.feeBasisPoints, "basis points");
    return;
  } catch (err) {
    console.log("\n✅ Platform not initialized yet, proceeding...");
  }

  // Initialize recurring platform
  console.log("\n🚀 Initializing recurring payment platform...");
  try {
    const tx = await recurringProgram.methods
      .initializePlatform(FEE_BASIS_POINTS, DAILY_VOLUME_LIMIT)
      .accounts({
        admin: wallet.publicKey,
        platformState: platformState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Platform initialized");
    console.log("Transaction:", tx);
    console.log(
      "Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=${CLUSTER}`
    );
  } catch (err) {
    console.error("❌ Failed to initialize platform:", err);
    throw err;
  }

  // Initialize merchant registry
  console.log("\n🚀 Initializing merchant registry...");
  try {
    const tx = await merchantRegistryProgram.methods
      .initializeRegistry()
      .accounts({
        admin: wallet.publicKey,
        registryState: registryState,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Registry initialized");
    console.log("Transaction:", tx);
    console.log(
      "Explorer:",
      `https://explorer.solana.com/tx/${tx}?cluster=${CLUSTER}`
    );
  } catch (err) {
    console.error("❌ Failed to initialize registry:", err);
    throw err;
  }

  // Fetch and display state
  console.log("\n📊 Final State:");
  const platform = await recurringProgram.account.platformState.fetch(
    platformState
  );
  const registry = await merchantRegistryProgram.account.registryState.fetch(
    registryState
  );

  console.log("\nPlatform:");
  console.log("  Admin:", platform.admin.toBase58());
  console.log("  Fee:", platform.feeBasisPoints, "basis points (2.5%)");
  console.log("  Daily Limit:", platform.dailyVolumeLimit.toString(), "tokens");
  console.log("  Paused:", platform.isPaused);
  console.log("  Total Subscriptions:", platform.totalSubscriptions.toString());

  console.log("\nRegistry:");
  console.log("  Admin:", registry.admin.toBase58());
  console.log("  Total Merchants:", registry.totalMerchants.toString());
  console.log("  Verified Merchants:", registry.verifiedMerchants.toString());

  console.log("\n✅ Platform initialization complete!");
  console.log("\n📝 Save these addresses:");
  console.log(`
Platform State:  ${platformState.toBase58()}
Registry State:  ${registryState.toBase58()}
Admin:           ${wallet.publicKey.toBase58()}
  `);
}

initializePlatform()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
