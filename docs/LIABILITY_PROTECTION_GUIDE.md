# Lutrii: Complete Liability Protection Guide

**Last Updated:** 2026-02-11
**Purpose:** Protect Lutrii from legal liability while facilitating subscription payments
**Status:** Implementation roadmap

---

## Executive Summary

**Goal:** Operate Lutrii as a **software tool provider**, NOT a financial institution, payment processor, or money transmitter.

**Key Strategy:** Three-layer legal protection:
1. **Non-Custodial Architecture** ✅ (Already implemented)
2. **Legal Structure & Disclaimers** (This guide)
3. **Regulatory Compliance** (Minimize obligations)

**Risk Level:** LOW (if implemented correctly)

---

## Part 1: Legal Entity Structure

### Recommended: Delaware LLC (C-Corp track)

**Why Delaware LLC:**
- ✅ **Limited liability** - Personal assets protected
- ✅ **Flexible structure** - Can convert to C-Corp later
- ✅ **Strong legal precedent** - Well-tested corporate law
- ✅ **Privacy** - Members not publicly disclosed
- ✅ **Tax benefits** - Pass-through taxation (unless elected otherwise)

**Formation Steps:**

1. **Register Delaware LLC** ($90 + $300/year)
   - Name: "Lutrii Labs, LLC"
   - Registered agent: CT Corporation or similar ($300/year)
   - Operating agreement: Standard LLC template

2. **Apply for EIN** (Free)
   - IRS Form SS-4
   - Needed for bank accounts and taxes
   - Takes 1-2 weeks

3. **Open Business Bank Account**
   - Recommended: Mercury, Brex (crypto-friendly)
   - Separate from personal finances
   - Track all income and expenses

4. **Set Up Accounting**
   - Use QuickBooks or Xero
   - Hire accountant familiar with crypto
   - Track platform fee revenue
   - Keep records for 7 years

**Cost:** ~$1,500/year (formation + agent + accounting)

---

### Alternative: Foundation (Long-Term)

**For Post-PMF (Product-Market Fit):**

Once Lutrii is successful, consider transitioning to a **non-profit foundation** for better liability protection:

**Cayman Islands Foundation** (Popular for crypto projects)
- ✅ **No beneficial owner** - Foundation owns itself
- ✅ **Limited liability** - Protectors and supervisors not personally liable
- ✅ **Tax advantages** - No income tax in Cayman Islands
- ✅ **Regulatory clarity** - Well-understood for crypto

**Swiss Foundation** (Alternative)
- ✅ **Strong legal protection** - Switzerland has crypto-friendly laws
- ✅ **Reputation** - More credible than Cayman for some users
- ❌ **More expensive** - $50k+ setup costs

**US 501(c)(3) Non-Profit** (If mission-driven)
- ✅ **Tax-exempt** - No federal income tax
- ✅ **Donations** - Can receive tax-deductible donations
- ✅ **Grants** - Eligible for foundation grants
- ❌ **Strict rules** - Can't distribute profits

**Recommendation:** Start with Delaware LLC, transition to foundation at $10M+ ARR

---

### NOT Recommended: DAO (Too Risky)

**Why NOT a pure DAO:**
- ❌ **No liability protection** - All token holders could be liable
- ❌ **Unclear legal status** - Courts treat as general partnership
- ❌ **Regulatory risk** - SEC may view tokens as securities
- ❌ **No bank account** - Hard to interact with traditional finance

**Better:** "DAO-like" governance within an LLC (LLC owns protocol, DAO votes on decisions)

---

## Part 2: Regulatory Compliance

### Critical: NOT a Money Transmitter

**Money Transmitter Definition (FinCEN):**
A business that:
1. Accepts currency, funds, or value
2. Transmits it to another person or location
3. For a fee or other value

**Why Lutrii is NOT a Money Transmitter:**

✅ **Non-custodial** - We never accept or hold customer funds
✅ **No transmission** - Users send funds directly via blockchain
✅ **Software only** - We provide software that interacts with blockchain
✅ **No control** - We can't stop, reverse, or redirect transactions

**Legal Precedent:**
- **Coin Center guidance** - Non-custodial software is not money transmission
- **Wyoming DAO law** - Non-custodial crypto tools exempt
- **FinCEN 2019 guidance** - "Providers of tools" not money transmitters

**Action Items:**
1. ✅ **Never hold user funds** (already implemented)
2. ✅ **Clear ToS** - Explicitly state non-custodial nature (already written)
3. ✅ **Legal opinion** - Get letter from lawyer confirming status ($5k-15k)
4. ⏳ **Monitor regulations** - Laws may change

---

### State-by-State Analysis

**States That May Require Licenses:**

**New York (BitLicense):**
- ❌ **High risk** - Broadest definition of "virtual currency business"
- ✅ **Exemption:** Non-custodial software may be exempt
- **Action:** Get legal opinion OR block NY users initially

**California (Money Transmitter License):**
- ❌ **Requires license** if deemed money transmission
- ✅ **Exemption:** Non-custodial software likely exempt
- **Action:** Legal opinion OR block CA users initially

**Other States:**
- Most states follow FinCEN guidance
- Non-custodial software generally exempt
- Monitor on case-by-case basis

**Recommendation:**
1. **Phase 1:** Block NY and CA (safest)
2. **Phase 2:** Get legal opinions ($15k) and add states
3. **Phase 3:** Nationwide rollout after regulatory clarity

---

### Federal Compliance

**FinCEN (Financial Crimes Enforcement Network):**

**NOT required to register as MSB (Money Service Business)** if:
- ✅ Non-custodial software
- ✅ No control over funds
- ✅ No access to private keys

**But MUST:**
- ✅ Have AML/KYC policies (even if not collecting KYC)
- ✅ File SAR (Suspicious Activity Reports) if aware of illegal activity
- ✅ Maintain records of suspicious activity
- ✅ Appoint compliance officer

**Recommendation:**
- Implement basic AML policy (template below)
- Monitor for obvious illegal activity (terrorist financing, sanctions violations)
- Suspend merchants engaging in prohibited activities
- Keep records of suspensions

---

**OFAC (Office of Foreign Assets Control):**

**MUST comply with sanctions:**
- ✅ Block users from sanctioned countries (Iran, North Korea, Syria, etc.)
- ✅ Block wallets on OFAC SDN list
- ✅ Screen merchant applications

**Implementation:**
- Use Chainalysis or TRM Labs for wallet screening ($500-2k/month)
- Block users from sanctioned jurisdictions
- Require merchants to confirm no OFAC sanctions

---

**SEC (Securities and Exchange Commission):**

**Platform fees are NOT securities** because:
- ✅ Utility token (USDC) - not a security
- ✅ No investment contract - users pay for service, not investment
- ✅ No expectation of profit - fees for functionality

**But MUST avoid:**
- ❌ Launching a token (without legal opinion)
- ❌ Offering revenue share (could be security)
- ❌ Marketing as "investment" (focus on utility)

**Recommendation:**
- No token launch initially
- Focus on utility (subscription payments)
- If token later, get securities lawyer ($50k+)

---

**IRS (Tax Compliance):**

**Platform fees are taxable income:**
- Report as business income (Form 1040 Schedule C or 1120)
- Issue 1099s to contractors (if any)
- May need to report merchant payments (1099-K threshold: $600+)
- Crypto-to-crypto treated as taxable events

**Recommendation:**
- Hire crypto-savvy accountant ($3k-10k/year)
- Use crypto tax software (CoinTracker, TaxBit)
- Keep meticulous records
- File quarterly estimated taxes

---

## Part 3: Insurance

### Errors & Omissions Insurance (E&O)

**What it covers:**
- Professional negligence claims
- Software bugs causing financial loss
- Failure to deliver services as promised
- Legal defense costs

**Why you need it:**
- User sues claiming bug caused loss of $100k
- Merchant sues claiming platform downtime cost revenue
- Protects against "we trusted your software and lost money"

**Cost:** $2k-5k/year for $1M coverage

**Recommended Providers:**
- Hiscox (tech-friendly)
- Chubb (high-coverage)
- Hartford (affordable)

**Coverage needed:**
- $1M per occurrence
- $2M aggregate
- Includes cyber liability
- Covers smart contract bugs

---

### Cyber Liability Insurance

**What it covers:**
- Data breaches
- Ransomware attacks
- Privacy violations (GDPR fines)
- Notification costs (breach disclosure)
- Forensic investigation
- Legal defense

**Why you need it:**
- Hacker breaches notification server
- GDPR regulator fines for privacy violation
- User sues over data leak

**Cost:** $1k-3k/year for $500k coverage

**Often bundled with E&O insurance.**

---

### Directors & Officers Insurance (D&O)

**What it covers:**
- Lawsuits against company leaders
- Shareholder derivative suits
- Employment practices liability
- Regulatory investigations

**When you need it:**
- When you have outside investors
- When you have board members
- When you raise VC funding

**Cost:** $5k-15k/year for $1M coverage

**Recommendation:** Wait until Series A funding

---

## Part 4: Risk Mitigation Strategies

### Smart Contract Audit Insurance

**Nexus Mutual or similar:**
- Users can buy insurance against smart contract bugs
- You pay premium, users get coverage
- Reduces your liability (users have recourse beyond suing you)

**Cost:** 1-3% of total value locked (TVL)

**Benefits:**
- Users feel safer
- Reduces your legal risk
- Professional risk assessment

---

### Bug Bounty Program

**Immunefi or HackerOne:**
- Pay hackers to find bugs BEFORE exploits
- Shows good faith effort
- Reduces liability ("we took reasonable precautions")

**Recommended Bounties:**
- Critical: $50k-100k
- High: $10k-25k
- Medium: $1k-5k
- Low: $100-500

**Cost:** ~$100k/year (budgeted, paid only if bugs found)

---

### Emergency Pause Mechanism

**Already implemented in your code:**

```rust
pub fn emergency_pause(ctx: Context<AdminAction>) -> Result<()> {
    let platform = &mut ctx.accounts.platform_state;
    platform.emergency_pause = true;
    // ...
}
```

**Why it protects you:**
- Shows you can respond to crises
- Demonstrates duty of care
- Limits damages in case of exploit

**But MUST document:**
- Clear emergency procedures
- Who can trigger pause
- How quickly you'll respond
- Communication plan

---

### Graduated Rollout

**Phase 1: Beta (Invite-Only)**
- 100 users, $10k max TVL
- Test in production with limited risk
- Gather feedback, fix bugs
- Build track record

**Phase 2: Public Beta (Open, with caps)**
- 1,000 users, $100k max TVL
- Subscription caps: $100/month max
- Lifetime caps: $1,000 max
- Gradually increase limits

**Phase 3: Full Launch**
- Remove caps gradually
- Monitor for issues
- Scale infrastructure

**Why this protects you:**
- Limits maximum potential damages
- Shows reasonable care (started small)
- Builds confidence incrementally

---

## Part 5: Merchant Vetting

### Prevent Fraudulent Merchants

**KYB (Know Your Business) for High-Risk Merchants:**

**Tier 1 (Verified):**
- Manual review of application
- Business license verification (if applicable)
- Website check
- No KYC required (privacy-first)

**Tier 2 (Community):**
- Auto-approved based on metrics
- 100+ successful transactions
- Score > 1000
- < 5 failed transactions

**Tier 3 (Premium):**
- Enhanced verification
- Civic integration OR business docs
- Video call (optional)
- Higher trust = higher visibility

**Tier 4 (Suspended):**
- Automatic if score < -100
- Manual review required to reinstate
- Users warned

---

### Merchant Agreement

**Separate agreement for merchants:**

Key clauses:
- ✅ Merchant represents they have right to offer services
- ✅ Merchant responsible for service delivery
- ✅ Merchant responsible for refunds
- ✅ Merchant responsible for taxes
- ✅ Lutrii can suspend for violations
- ✅ Lutrii not liable for merchant actions

**Implementation:**
- Merchant clicks "I Agree" during verification
- Stored on-chain (immutable proof)
- Legally binding

---

## Part 6: Dispute Resolution

### Three-Tier System

**Tier 1: User-Merchant Direct**
- User contacts merchant for refund
- Merchant handles voluntarily
- Lutrii not involved

**Tier 2: Lutrii Mediation (Optional)**
- User files dispute in app
- Lutrii reviews evidence
- Non-binding recommendation
- Merchant reputation affected

**Tier 3: Arbitration (Binding)**
- User files for arbitration (AAA)
- Each pays own costs
- Binding decision
- Lutrii typically not a party (merchant vs user)

**Why this protects you:**
- Lutrii not required to participate
- Disputes are between user and merchant
- Clear escalation path
- Reduces your liability

---

## Part 7: Implementation Checklist

### Legal (Priority 1)

- [ ] **Form Delaware LLC** ($90 + $300/year agent)
- [ ] **Get EIN** (free, IRS Form SS-4)
- [ ] **Open business bank account** (Mercury, Brex)
- [ ] **Draft operating agreement** (template + lawyer review $1k)
- [ ] **Hire crypto lawyer for consultation** ($5k-15k)
  - Confirm non-custodial status
  - Review Terms of Service
  - Assess regulatory requirements
  - Get opinion letter on money transmitter status

**Total Cost:** ~$7k-20k first year, $5k-10k/year ongoing

---

### Insurance (Priority 2)

- [ ] **Get E&O insurance** ($2k-5k/year, $1M coverage)
- [ ] **Add cyber liability** ($1k-3k/year, $500k coverage)
- [ ] **Consider smart contract insurance** (Nexus Mutual)
- [ ] **D&O insurance** (later, when you have investors)

**Total Cost:** ~$3k-8k/year

---

### Compliance (Priority 3)

- [ ] **Write AML policy** (template below, $1k lawyer review)
- [ ] **Implement OFAC screening** (Chainalysis/TRM $500-2k/month)
- [ ] **Set up SAR filing process** (if needed)
- [ ] **Hire crypto accountant** ($3k-10k/year)
- [ ] **File business taxes quarterly**

**Total Cost:** ~$10k-30k/year

---

### Operational (Priority 4)

- [ ] **Bug bounty program** (Immunefi, ~$100k budget)
- [ ] **Emergency response plan** (documented procedures)
- [ ] **Merchant vetting process** (KYB for high-risk)
- [ ] **Dispute resolution system** (in-app flow)
- [ ] **Regular security audits** (quarterly reviews)

**Total Cost:** ~$50k-150k/year (mostly bug bounties)

---

## Part 8: Cost Summary

### Year 1 Startup Costs

| Item | Cost | Priority |
|------|------|----------|
| Legal entity formation | $1,500 | HIGH |
| Legal consultation | $10,000 | HIGH |
| Insurance (E&O + Cyber) | $5,000 | HIGH |
| OFAC screening tools | $6,000 | MEDIUM |
| Accounting setup | $5,000 | MEDIUM |
| Bug bounty program | $50,000 | MEDIUM |
| **TOTAL YEAR 1** | **~$77,500** | |

### Ongoing Annual Costs

| Item | Cost/Year | Priority |
|------|-----------|----------|
| Registered agent | $300 | HIGH |
| Legal retainer | $5,000-10,000 | HIGH |
| Insurance renewal | $5,000-8,000 | HIGH |
| OFAC screening | $6,000-24,000 | MEDIUM |
| Accounting & tax | $5,000-15,000 | HIGH |
| Bug bounties (paid if found) | $0-100,000 | MEDIUM |
| **TOTAL ANNUAL** | **~$21k-157k** | |

---

## Part 9: Jurisdiction Recommendations

### Where to Block Users (Initially)

**High-Risk Jurisdictions:**

**Sanctioned Countries (MUST block):**
- Iran, North Korea, Syria, Cuba, Venezuela (certain regions)
- Crimea, Donetsk, Luhansk regions
- OFAC SDN list

**High Regulatory Risk (SHOULD block initially):**
- New York, USA (BitLicense)
- California, USA (Strict money transmitter laws)
- China (Crypto ban)
- India (Regulatory uncertainty)

**Implementation:**
- Detect location via RPC endpoint
- Block transaction submission from risky jurisdictions
- Show clear message: "Not available in your region"

**Gradual Expansion:**
- Phase 1: Delaware, Wyoming, Texas (crypto-friendly states)
- Phase 2: Most US states (except NY, CA)
- Phase 3: International (EU, LatAm)
- Phase 4: NY, CA (with licenses)

---

## Part 10: Templates

### AML Policy Template

```markdown
# Lutrii Anti-Money Laundering (AML) Policy

**Effective:** 2026-02-11

## 1. Commitment
Lutrii is committed to preventing money laundering and terrorist financing.

## 2. Compliance Officer
**Name:** [Your Name]
**Email:** compliance@lutrii.com

## 3. Risk Assessment
Lutrii is LOW RISK for money laundering because:
- Non-custodial (no funds held)
- Transparent (all transactions on-chain)
- Limited functionality (subscriptions only)

## 4. Customer Due Diligence (CDD)
**Users:** No KYC required (non-custodial software)
**Merchants:** Basic verification (business name, wallet address)

## 5. Transaction Monitoring
- Monitor for sanctioned wallets (OFAC SDN list)
- Flag large transactions (>$10k)
- Review unusual patterns (rapid subscriptions/cancellations)

## 6. Suspicious Activity Reporting
If we detect:
- Sanctioned wallet usage
- Obvious terrorist financing
- Patterns consistent with money laundering

We will:
- Suspend the account
- File SAR with FinCEN (if required)
- Cooperate with law enforcement

## 7. Record Keeping
Maintain records for 5 years:
- Merchant applications
- Suspended accounts
- Unusual transactions
- SARs filed

## 8. Training
All team members complete AML training annually.

## 9. Policy Review
This policy is reviewed annually and updated as needed.

**Last Review:** 2026-02-11
**Next Review:** 2027-02-11

---

**Approved by:**
[Your Name], Compliance Officer
```

---

### Emergency Response Plan

```markdown
# Lutrii Emergency Response Plan

## Scenarios

### 1. Smart Contract Bug Discovered

**Severity: CRITICAL**

**Actions:**
1. Immediately trigger emergency pause (admin wallet)
2. Post notice on Twitter, Discord, website
3. Contact security firm (Trail of Bits, OpenZeppelin)
4. Assess impact (how many users, how much at risk)
5. Prepare fix (if possible) or migration plan
6. Communicate timeline to users
7. Deploy fix OR migrate to new contract
8. Post-mortem report

**Responsible:** CTO/Lead Developer
**Response Time:** < 1 hour

---

### 2. Solana Network Down

**Severity: MEDIUM**

**Actions:**
1. Post status update (Twitter, Discord)
2. Monitor Solana status page
3. No action needed (out of our control)
4. Communicate expected resolution time
5. Resume normal operations when network recovers

**Responsible:** Operations
**Response Time:** < 30 minutes (communication)

---

### 3. User Reports Unauthorized Payment

**Severity: HIGH**

**Actions:**
1. Investigate transaction on-chain
2. Verify subscription authorization was given
3. Check if merchant changed price > 10%
4. If legitimate, guide user to contact merchant
5. If unauthorized, flag merchant account
6. If bug, trigger emergency investigation

**Responsible:** Support Team
**Response Time:** < 2 hours

---

### 4. Merchant Fraud Reported

**Severity: MEDIUM**

**Actions:**
1. Gather evidence from user
2. Review merchant history
3. Suspend merchant account (prevent new subscriptions)
4. Post warning in merchant profile
5. Investigate scope (how many affected)
6. Facilitate refunds if merchant cooperates
7. Permanent ban if fraud confirmed

**Responsible:** Trust & Safety Team
**Response Time:** < 24 hours

---

### 5. Regulatory Inquiry

**Severity: HIGH**

**Actions:**
1. DO NOT respond without lawyer
2. Contact legal counsel immediately
3. Gather requested information
4. Lawyer reviews and responds
5. Cooperate fully with investigation
6. Document all communications

**Responsible:** CEO + Legal Counsel
**Response Time:** Contact lawyer < 4 hours

**NEVER:**
- ❌ Admit fault or liability
- ❌ Provide info without lawyer review
- ❌ Delete records or obstruct

---

## Contact Information

**Legal:** legal@lutrii.com | [Lawyer Name] | [Phone]
**Security:** security@lutrii.com | [Security Firm] | [Phone]
**PR:** pr@lutrii.com | [PR Firm] | [Phone]

## Post-Mortem Template

After every incident:
1. What happened?
2. What was the impact?
3. What was our response time?
4. What worked well?
5. What could be improved?
6. What changes will prevent recurrence?

**Published publicly for transparency.**
```

---

## Summary: Maximum Legal Protection

### Three Pillars:

1. **Non-Custodial Architecture** ✅
   - Never hold user funds
   - Never access private keys
   - Blockchain handles all transactions

2. **Legal Structure & Insurance**
   - Delaware LLC ($1.5k)
   - Terms of Service (comprehensive)
   - E&O + Cyber insurance ($5k/year)
   - Legal opinion on non-custodial status ($10k)

3. **Operational Best Practices**
   - AML policy
   - OFAC screening
   - Bug bounty program
   - Emergency response plan
   - Graduated rollout

**Total Investment:** ~$77k Year 1, ~$21k-157k/year ongoing

**Result:** Minimal legal liability, maximum user protection

---

## Recommendation

**Implement in this order:**

### Phase 1: Legal Foundation (Weeks 1-4)
1. Form Delaware LLC
2. Get EIN
3. Open business bank account
4. Hire crypto lawyer ($10k)
5. File Terms of Service

### Phase 2: Insurance & Compliance (Weeks 5-8)
1. Get E&O + Cyber insurance
2. Implement OFAC screening
3. Write AML policy
4. Set up accounting

### Phase 3: Launch (Weeks 9-12)
1. Beta launch (invite-only, 100 users)
2. Monitor for issues
3. Refine processes
4. Public launch

### Phase 4: Scale (Month 4+)
1. Expand to more states
2. Add bug bounty program
3. Regular security audits
4. Consider foundation structure (later)

**You'll be protected from Day 1. Users will trust you. Regulators will see you're compliant. You can scale with confidence.**

---

**Created:** 2026-02-11
**Status:** Implementation roadmap
**Legal Review:** Required before deployment
**Next Steps:** Form Delaware LLC and hire crypto lawyer

