use anchor_lang::prelude::*;

/// Platform configuration for multi-token payments and fee collection
///
/// Phase 1: Single fee wallet per stablecoin (USDC + USD1)
/// Phase 3: Automated fee splitting to operations/LP/marketing wallets
#[account]
pub struct PlatformConfig {
    /// Admin authority (can update config)
    pub authority: Pubkey,              // 32

    /// Fee wallet for USDC fees (Phase 1: all fees go here)
    pub fee_wallet_usdc: Pubkey,        // 32

    /// Fee wallet for USD1 fees (Phase 1: all fees go here)
    pub fee_wallet_usd1: Pubkey,        // 32

    /// PDA bump
    pub bump: u8,                       // 1

    // ========================================================================
    // RESERVED FOR PHASE 3 - Automated Fee Splitting
    // ========================================================================

    /// Phase 3: Operations wallet (60% of fees)
    pub reserved1: Pubkey,              // 32

    /// Phase 3: LP provision wallet (30% of fees)
    pub reserved2: Pubkey,              // 32

    /// Phase 3: Marketing wallet (10% of fees)
    pub reserved3: Pubkey,              // 32

    /// Phase 3: Flag to enable automated splitting (0 = disabled, 1 = enabled)
    pub reserved4: u8,                  // 1

    /// Extra padding for future upgrades
    pub reserved5: [u8; 63],            // 63
}

impl PlatformConfig {
    /// Total space required for account
    pub const LEN: usize = 8 +          // discriminator
        32 +                             // authority
        32 +                             // fee_wallet_usdc
        32 +                             // fee_wallet_usd1
        1 +                              // bump
        32 +                             // reserved1 (operations)
        32 +                             // reserved2 (lp_provision)
        32 +                             // reserved3 (marketing)
        1 +                              // reserved4 (split_enabled)
        63;                              // reserved5 (padding)

    /// Get the appropriate fee wallet based on settlement token
    ///
    /// # Arguments
    /// * `settlement_token` - The settlement token mint (USDC or USD1)
    /// * `usdc_mint` - USDC mint address
    /// * `usd1_mint` - USD1 mint address
    ///
    /// # Returns
    /// The fee wallet pubkey for the given settlement token
    ///
    /// # Panics
    /// If settlement_token is not USDC or USD1
    pub fn get_fee_wallet(
        &self,
        settlement_token: &Pubkey,
        usdc_mint: &Pubkey,
        usd1_mint: &Pubkey,
    ) -> Pubkey {
        if settlement_token == usdc_mint {
            self.fee_wallet_usdc
        } else if settlement_token == usd1_mint {
            self.fee_wallet_usd1
        } else {
            panic!("Unsupported settlement token for fee collection");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_config_len() {
        // Verify space calculation is correct
        assert_eq!(
            PlatformConfig::LEN,
            8 + 32 + 32 + 32 + 1 + 32 + 32 + 32 + 1 + 63
        );
        assert_eq!(PlatformConfig::LEN, 265);
    }

    #[test]
    fn test_get_fee_wallet_usdc() {
        let usdc_mint = Pubkey::new_unique();
        let usd1_mint = Pubkey::new_unique();
        let usdc_fee_wallet = Pubkey::new_unique();
        let usd1_fee_wallet = Pubkey::new_unique();

        let config = PlatformConfig {
            authority: Pubkey::new_unique(),
            fee_wallet_usdc: usdc_fee_wallet,
            fee_wallet_usd1: usd1_fee_wallet,
            bump: 255,
            reserved1: Pubkey::default(),
            reserved2: Pubkey::default(),
            reserved3: Pubkey::default(),
            reserved4: 0,
            reserved5: [0; 63],
        };

        assert_eq!(
            config.get_fee_wallet(&usdc_mint, &usdc_mint, &usd1_mint),
            usdc_fee_wallet
        );
    }

    #[test]
    fn test_get_fee_wallet_usd1() {
        let usdc_mint = Pubkey::new_unique();
        let usd1_mint = Pubkey::new_unique();
        let usdc_fee_wallet = Pubkey::new_unique();
        let usd1_fee_wallet = Pubkey::new_unique();

        let config = PlatformConfig {
            authority: Pubkey::new_unique(),
            fee_wallet_usdc: usdc_fee_wallet,
            fee_wallet_usd1: usd1_fee_wallet,
            bump: 255,
            reserved1: Pubkey::default(),
            reserved2: Pubkey::default(),
            reserved3: Pubkey::default(),
            reserved4: 0,
            reserved5: [0; 63],
        };

        assert_eq!(
            config.get_fee_wallet(&usd1_mint, &usdc_mint, &usd1_mint),
            usd1_fee_wallet
        );
    }

    #[test]
    #[should_panic(expected = "Unsupported settlement token")]
    fn test_get_fee_wallet_invalid_token() {
        let usdc_mint = Pubkey::new_unique();
        let usd1_mint = Pubkey::new_unique();
        let invalid_mint = Pubkey::new_unique();

        let config = PlatformConfig {
            authority: Pubkey::new_unique(),
            fee_wallet_usdc: Pubkey::new_unique(),
            fee_wallet_usd1: Pubkey::new_unique(),
            bump: 255,
            reserved1: Pubkey::default(),
            reserved2: Pubkey::default(),
            reserved3: Pubkey::default(),
            reserved4: 0,
            reserved5: [0; 63],
        };

        config.get_fee_wallet(&invalid_mint, &usdc_mint, &usd1_mint);
    }
}
