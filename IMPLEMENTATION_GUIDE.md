# Lutrii Implementation Guide

## 🎉 What We've Built So Far

### ✅ Completed Components

#### 1. Smart Contracts (Anchor/Rust)
- **lutrii-recurring** - Core subscription management with:
  - Clockwork integration for decentralized scheduling
  - Token-2022 support for USDC payments
  - Comprehensive security controls (circuit breaker, velocity limits)
  - Fee calculation (0.1% with min/max caps)
  - Pause/resume/cancel functionality
  - Emergency pause (admin)

- **lutrii-merchant-registry** - Merchant verification with:
  - Multi-tier verification system (Unverified/Verified/Community/Suspended)
  - Community scoring algorithm
  - Premium badge subscriptions ($50 USDC/month)
  - Review system (1-5 stars)
  - Automatic upgrades and suspensions based on performance

#### 2. Project Structure
```
lutrii/
├── programs/
│   ├── lutrii-recurring/        ✅ Complete
│   └── lutrii-merchant-registry/ ✅ Complete
├── mobile/
│   ├── src/
│   │   ├── store/
│   │   │   ├── subscriptionStore.ts  ✅ Complete (Zustand + MMKV)
│   │   │   └── walletStore.ts        ✅ Complete
│   │   └── utils/
│   │       └── storage.ts            ✅ Complete (MMKV integration)
│   └── package.json                  ✅ Complete
├── Anchor.toml                       ✅ Complete
├── Cargo.toml                        ✅ Complete
├── package.json                      ✅ Complete
└── README.md                         ✅ Complete
```

---

## 🚀 Next Steps to Complete Lutrii

### Phase 1: Complete Mobile App Foundation (Week 1-2)

#### A. Solana Mobile Wallet Adapter Integration
Create `/mobile/src/services/walletService.ts`:
```typescript
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { Connection, PublicKey } from '@solana/web3.js';

export class WalletService {
  async connect() {
    // Implement MWA connection
    // Update walletStore with publicKey
  }

  async signTransaction(tx) {
    // Sign with MWA
  }

  async signAndSendTransaction(tx) {
    // Sign and send
  }
}
```

#### B. Blockchain Service
Create `/mobile/src/services/blockchainService.ts`:
```typescript
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';

export class BlockchainService {
  connection: Connection;
  program: Program;

  async createSubscription(params) {
    // Call lutrii-recurring program
  }

  async pauseSubscription(publicKey) {
    // Call pause instruction
  }

  async fetchSubscriptions(userPublicKey) {
    // Fetch all user subscriptions
  }
}
```

#### C. Core UI Components with Reanimated
Create `/mobile/src/components/`:

1. **SubscriptionCard.tsx** - Animated card with smooth interactions
2. **ApplePayButton.tsx** - Familiar checkout button
3. **BiometricPrompt.tsx** - Face ID/Fingerprint auth
4. **LoadingSpinner.tsx** - Smooth loading states
5. **BottomSheet.tsx** - Smooth bottom sheet modals

Example with Reanimated:
```typescript
import Animated, { FadeInDown, useAnimatedStyle } from 'react-native-reanimated';

export const SubscriptionCard = ({ subscription }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(subscription.isPaused ? 0.95 : 1) }],
  }));

  return (
    <Animated.View entering={FadeInDown} style={animatedStyle}>
      {/* Card content */}
    </Animated.View>
  );
};
```

#### D. Navigation Setup
Create `/mobile/src/navigation/AppNavigator.tsx`:
```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Screens: Home, Subscriptions, Merchants, Analytics, Settings
```

---

### Phase 2: Growth Features (Week 3-4)

#### A. Moonpay Integration
Create `/mobile/src/services/moonpayService.ts`:
```typescript
import { MoonpaySDK } from '@moonpay/sdk';

export class MoonpayService {
  async buyUSDC(amount: number, walletAddress: string) {
    const moonpay = new MoonpaySDK({
      apiKey: process.env.MOONPAY_API_KEY,
    });

    await moonpay.show({
      walletAddress,
      currencyCode: 'USDC_SOL',
      baseCurrencyAmount: amount.toString(),
    });
  }
}
```

#### B. Jupiter Auto-Swap
Create `/mobile/src/services/jupiterService.ts`:
```typescript
import { Jupiter } from '@jup-ag/core';

export class JupiterService {
  async swapSOLtoUSDC(amountUSDCNeeded: number) {
    const jupiter = await Jupiter.load({ connection, user: wallet });

    const routes = await jupiter.computeRoutes({
      inputMint: NATIVE_SOL,
      outputMint: USDC_MINT,
      amount: calculateSOLAmount(amountUSDCNeeded),
      slippageBps: 50,
    });

    const { execute } = await jupiter.exchange({
      routeInfo: routes.routesInfos[0],
    });

    return await execute();
  }
}
```

#### C. QR Code Scanner
Create `/mobile/src/screens/ScanMerchantScreen.tsx`:
```typescript
import { RNCamera } from 'react-native-camera';

export const ScanMerchantScreen = () => {
  const handleBarCodeScanned = ({ data }) => {
    const merchantData = parseSolanaURI(data);
    navigation.navigate('CreateSubscription', { prefilled: merchantData });
  };

  return <RNCamera onBarCodeRead={handleBarCodeScanned} />;
};
```

#### D. NFC Support
Create `/mobile/src/services/nfcService.ts`:
```typescript
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export class NFCService {
  async readMerchantTag() {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    return parseNDEF(tag.ndefMessage);
  }
}
```

#### E. Gamification System
Create new Anchor program `/programs/lutrii-achievements/`:
```rust
#[program]
pub mod lutrii_achievements {
    pub fn claim_achievement(ctx: Context<ClaimAchievement>, achievement_id: u8) {
        // Mint NFT badge
        // Award SOL reward
    }
}
```

#### F. Referral Program
Create `/programs/lutrii-referrals/`:
```rust
#[program]
pub mod lutrii_referrals {
    pub fn create_referral(ctx: Context<CreateReferral>) {
        // Generate referral code
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) {
        // Award 5 USDC to both parties
    }
}
```

---

### Phase 3: Analytics & UX Polish (Week 5-6)

#### A. Spending Analytics Dashboard
Create `/mobile/src/screens/AnalyticsScreen.tsx`:
```typescript
import { VictoryPie, VictoryLine } from 'victory-native';

export const AnalyticsScreen = () => {
  const { subscriptions } = useSubscriptionStore();
  const categoryBreakdown = SubscriptionAnalytics.getCategoryBreakdown(subscriptions);
  const spendingTrend = SubscriptionAnalytics.getSpendingTrend(subscriptions);
  const savings = SubscriptionAnalytics.getSavingsVsTraditional(subscriptions);

  return (
    <ScrollView>
      <Card title="Monthly Spending">
        <Text>${getMonthlyTotal()}</Text>
        <Text>Saved ${savings.savings} vs traditional</Text>
      </Card>

      <Card title="Category Breakdown">
        <VictoryPie data={categoryBreakdown} />
      </Card>

      <Card title="Spending Trend">
        <VictoryLine data={spendingTrend} />
      </Card>
    </ScrollView>
  );
};
```

#### B. Apple Pay-Style Checkout
Create `/mobile/src/components/CheckoutSheet.tsx`:
```typescript
import { BlurView } from '@react-native-community/blur';
import ReactNativeBiometrics from 'react-native-biometrics';

export const CheckoutSheet = ({ subscription }) => {
  const handleBiometricAuth = async () => {
    const { success } = await biometrics.simplePrompt({
      promptMessage: 'Confirm subscription',
    });

    if (success) {
      await createSubscription(subscription);
    }
  };

  return (
    <BlurView intensity={95}>
      <Text>{subscription.merchantName}</Text>
      <Text>${subscription.amount}/mo</Text>
      <TouchableOpacity onPress={handleBiometricAuth}>
        <FaceIDIcon />
        <Text>Confirm with Face ID</Text>
      </TouchableOpacity>
    </BlurView>
  );
};
```

#### C. Multi-Channel Notifications
Create `/mobile/src/services/notificationService.ts`:
```typescript
import messaging from '@react-native-firebase/messaging';

export class NotificationService {
  async sendPaymentNotification(subscription) {
    // Push notification
    await messaging().send({
      notification: {
        title: 'Payment Processed',
        body: `$${subscription.amount} paid to ${subscription.merchantName}`,
      },
    });

    // SMS for high-value (if enabled)
    if (subscription.amount > 50) {
      await sendSMS(user.phone, `Lutrii: Paid $${subscription.amount}`);
    }
  }
}
```

---

### Phase 4: Security & Testing (Week 7-8)

#### A. Social Recovery with Squads
Create `/mobile/src/services/socialRecoveryService.ts`:
```typescript
import { Squads } from '@squads-protocol/sdk';

export class SocialRecoveryService {
  async setupRecovery(guardians: PublicKey[]) {
    const squads = Squads.endpoint(connection);

    const multisig = await squads.createMultisig({
      threshold: 2,
      createKey: userWallet.publicKey,
      members: guardians,
      name: `${userWallet.toBase58()}_recovery`,
    });

    return multisig;
  }
}
```

#### B. Circuit Breaker Integration
Update blockchain service to check platform state before transactions.

#### C. Jito MEV Protection
Create `/mobile/src/services/jitoService.ts`:
```typescript
import { searcherClient } from 'jito-ts';

export class JitoService {
  async sendProtectedBundle(transactions) {
    const client = searcherClient(JITO_BLOCK_ENGINE_URL);
    const bundleId = await client.sendBundle(transactions);
    return bundleId;
  }
}
```

#### D. Test Suites
Create `/programs/lutrii-recurring/tests/`:
- `subscription_lifecycle.ts` - Create, pause, resume, cancel
- `payment_execution.ts` - Clockwork payment execution
- `security_tests.ts` - Circuit breaker, velocity limits
- `fee_calculation.ts` - Fee edge cases

Create `/mobile/__tests__/`:
- `subscriptionStore.test.ts`
- `walletService.test.ts`
- `jupiterService.test.ts`

---

### Phase 5: Launch Preparation (Week 9-12)

#### A. Security Audit
1. Engage audit firm (Zellic, OtterSec, or Neodyme)
2. Budget: $50,000 - $70,000
3. Address all findings
4. Publish audit report

#### B. Merchant Partnerships
1. Recruit 10-15 verified merchants
2. Create merchant onboarding SDK
3. Test integrations
4. Set up webhooks

#### C. Beta Testing
1. Deploy to devnet
2. Recruit 200+ beta testers
3. Distribute via TestFlight (iOS) and Internal Testing (Android)
4. Collect feedback, iterate

#### D. Marketing Materials
1. Create app store listings
2. Screenshots and videos
3. Press kit
4. Social media presence (Twitter, Discord)
5. Launch campaign

#### E. Deploy to Mainnet
```bash
# 1. Build optimized programs
anchor build --verifiable

# 2. Deploy to mainnet
anchor deploy --provider.cluster mainnet

# 3. Verify on Solscan
solana-verify verify-from-repo --program-id <PROGRAM_ID>

# 4. Initialize platform
ts-node scripts/initialize_mainnet.ts

# 5. Transfer upgrade authority to multisig
solana program set-upgrade-authority <PROGRAM_ID> <MULTISIG>
```

---

## 📋 Development Commands

### Smart Contracts
```bash
# Build contracts
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Generate TypeScript client
anchor idl init <PROGRAM_ID> --filepath target/idl/lutrii_recurring.json
```

### Mobile App
```bash
# Install dependencies
cd mobile && yarn install

# Run on Android (Saga Seeker)
yarn android

# Run on iOS (development only)
yarn ios

# Type check
yarn type-check

# Run tests
yarn test

# Build release APK
cd android && ./gradlew assembleRelease
```

---

## 🔧 Environment Setup

### 1. Install Solana & Anchor
```bash
# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.29.0
avm use 0.29.0
```

### 2. Configure Solana
```bash
# Create wallet
solana-keygen new

# Set to devnet
solana config set --url devnet

# Airdrop SOL
solana airdrop 2
```

### 3. Install React Native Dependencies
```bash
# Install Node dependencies
cd mobile && yarn install

# iOS pods
cd ios && pod install

# Android build tools (already setup on Saga Seeker)
```

### 4. Environment Variables
Create `/mobile/.env`:
```
SOLANA_RPC_URL=https://api.devnet.solana.com
MOONPAY_API_KEY=pk_test_xxx
JITO_BLOCK_ENGINE_URL=https://mainnet.block-engine.jito.wtf
FIREBASE_CONFIG=xxx
```

---

## 🎯 Key Features Status

| Feature | Status | Priority | ETA |
|---------|--------|----------|-----|
| Core smart contracts | ✅ Complete | P0 | Done |
| Merchant registry | ✅ Complete | P0 | Done |
| MMKV storage | ✅ Complete | P0 | Done |
| Zustand stores | ✅ Complete | P0 | Done |
| Wallet adapter | 🚧 In Progress | P0 | Week 1 |
| Subscription UI | 🚧 In Progress | P0 | Week 1-2 |
| Fiat on-ramp | ⏳ Not Started | P1 | Week 3 |
| Jupiter swap | ⏳ Not Started | P1 | Week 3 |
| QR/NFC scanning | ⏳ Not Started | P1 | Week 3 |
| Gamification | ⏳ Not Started | P2 | Week 4 |
| Referrals | ⏳ Not Started | P2 | Week 4 |
| Analytics | ⏳ Not Started | P1 | Week 5 |
| Social recovery | ⏳ Not Started | P2 | Week 6 |
| Security audit | ⏳ Not Started | P0 | Week 7-8 |
| Beta testing | ⏳ Not Started | P0 | Week 9-10 |
| Mainnet launch | ⏳ Not Started | P0 | Week 12 |

---

## 🚨 Critical Path Items

These **MUST** be completed before launch:

1. **Security Audit** ($50k-70k) - Non-negotiable
2. **Fiat On-Ramp** - Required for mainstream adoption
3. **Clockwork Testing** - Verify automated payments work reliably
4. **10+ Merchant Partnerships** - Need real merchants at launch
5. **200+ Beta Testers** - Validate UX and find bugs
6. **App Store Approval** - Start process early (especially iOS)

---

## 💡 Pro Tips

### Performance
- Use `React.memo()` for expensive components
- Implement virtualization for long subscription lists
- Use Reanimated's `useSharedValue` for smooth 60fps animations
- Profile with Hermes profiler before launch

### UX
- Add haptic feedback on all interactions
- Show loading skeletons instead of spinners
- Implement optimistic updates (update UI before blockchain confirms)
- Add empty states with clear CTAs

### Security
- Rate limit API calls
- Implement request signing
- Add transaction simulation before signing
- Show clear security warnings for high-value operations

---

## 📞 Support & Resources

- **Solana Docs**: https://docs.solana.com
- **Anchor Docs**: https://www.anchor-lang.com
- **Solana Mobile**: https://solanamobile.com/developers
- **Clockwork**: https://docs.clockwork.xyz
- **Jupiter**: https://docs.jup.ag

---

## 🎉 Launch Checklist

Before submitting to Solana Mobile dApp Store:

- [ ] All smart contracts audited
- [ ] 90%+ test coverage
- [ ] Zero critical bugs
- [ ] 10+ merchants integrated
- [ ] 200+ successful beta tests
- [ ] App store assets ready
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Support email setup
- [ ] Social media accounts active
- [ ] Press kit ready
- [ ] Bug bounty program launched
- [ ] Monitoring dashboards configured
- [ ] Incident response plan documented

---

**Built with ❤️ for Solana Mobile**

Next step: Continue implementation following the phases above. Focus on Phase 1 first (Mobile App Foundation), then move to growth features.
