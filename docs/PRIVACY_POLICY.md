# Lutrii Privacy Policy

**Last Updated:** 2026-02-11
**Effective Date:** 2026-02-11

---

## Our Privacy Philosophy

**We don't want your data. Seriously.**

Most companies say they "protect your privacy." We go further: **we don't collect your data in the first place**. What we don't have, we can't lose, sell, or misuse.

---

## What We DON'T Collect (The Important Part)

We **NEVER** collect, store, or process:

❌ Your name
❌ Your email address
❌ Your phone number
❌ Your physical address
❌ Your date of birth
❌ Government-issued ID
❌ Social security number
❌ Credit card information
❌ Bank account details
❌ IP addresses (logs auto-deleted after 1 hour)
❌ Device fingerprints
❌ Precise location data
❌ Browsing history
❌ Contacts list
❌ Photos or camera access
❌ Microphone or audio recordings
❌ Biometric data (fingerprints, face scans)
❌ Health or medical information
❌ Purchase history outside Lutrii

---

## What We Do Collect (Very Little)

### On-Chain Data (Public, Pseudonymous)

When you use Lutrii, the following data is stored **publicly on the Solana blockchain**:

✅ **Wallet public key** - Your Solana wallet address (required for blockchain transactions)
✅ **Subscription PDAs** - Program-derived addresses for your subscriptions (public, but not linked to your identity)
✅ **Payment records** - Transaction amounts and timestamps (public on Solana)
✅ **Merchant reviews** - Your ratings and comments (linked to wallet, not identity)

**Note:** Blockchain data is **permanent and public**. Anyone can view transactions associated with a wallet address, but wallet addresses are **pseudonymous** (not linked to your real identity unless you choose to reveal it).

### Off-Chain Data (Temporary, Minimal)

If you opt-in to push notifications:

✅ **Device push token** - Encrypted token for sending notifications (stored for 30 days, auto-deleted)
✅ **Notification encryption key** - Public key for end-to-end encryption (your device keeps the private key)

### Local-Only Data (Never Leaves Your Device)

The following data is stored **encrypted on your device only**:

✅ **Subscription metadata** - Merchant names, logos, custom labels (encrypted with device keystore)
✅ **Budget preferences** - Your monthly spending budget (local only)
✅ **Analytics** - Spending insights and trends (calculated on-device, never sent to servers)
✅ **App preferences** - Theme, language, notification settings (local only)

---

## How We Use Data

### On-Chain Data
- **Subscriptions** - To execute recurring payments according to your authorization
- **Payment records** - To show you payment history and calculate spending
- **Merchant reviews** - To display community reputation scores

### Push Notifications (Opt-In)
- **Device token** - To send you encrypted payment notifications
- **Encryption key** - To ensure only your device can read notifications

### Local Data
- **Subscription metadata** - To display merchant names and logos in the app
- **Budget preferences** - To alert you when approaching spending limits
- **Analytics** - To show you spending trends and insights (calculated on your device)

---

## Data Sharing

We **DO NOT** share your data with:

❌ Advertisers
❌ Data brokers
❌ Marketing companies
❌ Analytics providers (Google Analytics, Facebook Pixel, etc.)
❌ Social media platforms
❌ Third-party tracking services

We **ONLY** share on-chain data that is **already public** on the Solana blockchain. This is not "sharing" in the traditional sense—it's publicly visible by design of blockchain technology.

**Merchants** can see:
- Your wallet public key (when you subscribe)
- Payment amounts and timestamps (public on blockchain)
- Reviews you submit about their service

**Merchants CANNOT see:**
- Your name, email, or personal info
- Your other subscriptions
- Your wallet balance
- Your transaction history with other merchants

---

## Data Retention

### On-Chain Data
**Permanent** - Stored forever on the Solana blockchain. This is by design and cannot be deleted.

### Push Notification Data
**30 days** - Auto-deleted after 30 days or when you unsubscribe from notifications.

### Server Logs
**1 hour** - Auto-deleted for security and privacy.

### Local Device Data
**Until you delete the app** - Stored encrypted on your device until you uninstall Lutrii or manually clear app data.

---

## Your Privacy Rights

### Right to Access
You can export all data we store about you at any time:
- Go to Settings → Privacy → Export My Data
- Receives a JSON file with all your subscriptions, payments, and preferences

### Right to Deletion
You can delete all local data by:
- Uninstalling the Lutrii app
- OR Settings → Privacy → Delete All Data

**Note:** On-chain data (blockchain transactions) **cannot be deleted** as they are permanently stored on Solana. This is a fundamental property of blockchain technology.

### Right to Opt-Out
You can opt-out of optional features:
- **Push notifications** - Disable in app settings
- **Analytics** - Analytics are local-only; you can wipe them anytime

### Right to Portability
You can export your data in standard JSON format for use in other apps.

---

## Data Security

### On-Device Encryption
- All sensitive data encrypted using **iOS Keychain** or **Android Keystore**
- 256-bit AES encryption (hardware-backed when available)
- Encryption keys never leave your device

### End-to-End Encryption
- Push notifications encrypted end-to-end
- Only your device can decrypt notification content
- Push service cannot read your notifications

### Network Security
- All connections use **TLS 1.3** encryption
- Certificate pinning to prevent man-in-the-middle attacks
- Direct RPC connections to Solana (no backend intermediary)

### No Centralized Database
- No user database = no database breaches
- Can't leak what we don't have
- Minimal attack surface

---

## Third-Party Services

### Solana Blockchain
- **What they do:** Process and store blockchain transactions
- **What they know:** Wallet addresses, transaction amounts, timestamps (public data)
- **Privacy policy:** https://solana.com/privacy-policy

### RPC Providers (Helius, Alchemy, or user-chosen)
- **What they do:** Relay transactions to Solana blockchain
- **What they know:** Wallet addresses, transaction data (same as public blockchain)
- **Can opt-out:** Use your own RPC endpoint in settings

### Push Notification Service (Optional)
- **What they do:** Deliver encrypted push notifications
- **What they know:** Device token, encrypted message content (cannot decrypt)
- **Can opt-out:** Disable notifications in settings

### IPFS (For merchant logos)
- **What they do:** Host merchant logo images
- **What they know:** Logo file hashes (no user data)
- **Privacy policy:** Decentralized, no tracking

---

## Children's Privacy

Lutrii is **not intended for users under 18 years old**. We do not knowingly collect data from children.

If you are under 18, please do not use Lutrii.

---

## International Users

Lutrii is available worldwide. Your data is stored:
- **On Solana blockchain** - Distributed globally across validator nodes
- **On your device** - Wherever you are located
- **Push notification relay** - May be processed in USA (encrypted)

If you are in the **European Union**, you have additional rights under **GDPR**:
- Right to access
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object

If you are in **California**, you have rights under **CCPA**:
- Right to know what data we collect
- Right to delete your data
- Right to opt-out of sale (we don't sell data)

---

## Changes to This Policy

We may update this privacy policy occasionally. When we do:
- Update the "Last Updated" date at the top
- Notify you in the app (if changes are significant)
- Ask for your consent (if required by law)

You can always view the latest policy at: https://lutrii.com/privacy

---

## Contact Us

If you have questions about this privacy policy:

**Email:** privacy@lutrii.com
**GitHub:** https://github.com/QuaestorCodicis/lutrii/issues
**Discord:** https://discord.gg/lutrii

---

## Open Source

Lutrii is **100% open source**. You can audit our privacy claims:

- **Smart contracts:** https://github.com/QuaestorCodicis/lutrii/tree/main/programs
- **Mobile app:** https://github.com/QuaestorCodicis/lutrii/tree/main/mobile
- **Backend (optional relay):** https://github.com/QuaestorCodicis/lutrii/tree/main/backend

**Don't trust, verify.** Read the code yourself.

---

## Summary (TL;DR)

✅ **We don't collect personal data** (name, email, etc.)
✅ **Wallet address is public** (by design of blockchain)
✅ **All analytics run on your device** (never sent to servers)
✅ **End-to-end encrypted notifications** (we can't read them)
✅ **Open source code** (verify our claims)
✅ **No ads, no tracking, no data selling**

**Your subscriptions. Your data. Your control.**

---

**Effective Date:** 2026-02-11
**Version:** 1.0
**License:** CC BY 4.0 (you can share and adapt this policy)
