# GitHub Actions CI/CD Build Status

## Current Status: BLOCKED

After 34 build attempts, we've identified a **fundamental incompatibility** between:
- **Solana CLI 1.18.22** (required for Solana Mobile Seeker compatibility)
- **Anchor 0.30.1** dependencies (specifically `wit-bindgen` v0.51.0 which requires edition2024)
- **Rust toolchain** versions

## The Problem

### Dependency Requirements
1. `wit-bindgen-0.51.0` (transitive dependency from Anchor 0.30.1) requires **edition2024** support
2. edition2024 is only available in **Rust ≥ 1.85.0**
3. Rust 1.85.0's Cargo generates **lockfile version 4**
4. Solana 1.18.22's `cargo-build-sbf` cannot read **lockfile version 4**

### Catch-22 Situation
- **Rust < 1.85.0**: Supports lockfile v3 ✓, but lacks edition2024 ✗
- **Rust ≥ 1.85.0**: Supports edition2024 ✓, but generates lockfile v4 ✗

## Build Attempts Summary

| Builds | Approach | Result |
|--------|----------|--------|
| #14-23 | SSL errors + Solana installation issues | Fixed |
| #24 | Rust 1.75.0 | edition2024 error |
| #25 | Rust 1.85.0 + Anchor install | time crate error |
| #26 | Removed --locked flag | time crate version conflict |
| #27 | Rust 1.84.0 | edition2024 error |
| #28-30 | Delete Cargo.lock files | Still v4 lockfiles generated |
| #31 | anchor build deleted lockfiles | Still v4 lockfiles |
| #32 | cargo-build-sbf directly | Still v4 lockfiles |
| #33 | Remove separate Rust install | Still v4 lockfiles |
| #34 | Rust 1.82.0 | edition2024 error |

## Working Solutions

### Option 1: Build Locally (RECOMMENDED)
Build the programs on a local machine with compatible environment:

```bash
# Use Solana's bundled Rust toolchain
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Build with cargo-build-sbf directly
find . -name "Cargo.lock" -type f -delete
cargo-build-sbf --manifest-path=programs/lutrii-recurring/Cargo.toml
cargo-build-sbf --manifest-path=programs/lutrii-merchant-registry/Cargo.toml
```

The built `.so` files and IDLs can be committed to the repository or deployed directly.

### Option 2: Use Docker
Create a Docker image with the exact environment:
- Solana CLI 1.18.22
- Compatible Rust version with Solana's bundled toolchain
- Anchor dependencies pre-installed

### Option 3: Upgrade Solana CLI
If Solana Mobile Seeker compatibility allows, upgrade to a newer Solana CLI version that supports Cargo lockfile v4. This would require:
1. Testing with newer Solana versions (e.g., 1.19+)
2. Verifying Solana Mobile Seeker compatibility
3. Updating all Solana dependencies

### Option 4: Downgrade Anchor
Try Anchor versions < 0.30.0 that don't have edition2024 dependencies:
- May lose token_2022 features needed for USDC support
- May require code modifications
- Not recommended as newer features are actively used

## Technical Details

### Errors Encountered

**Edition2024 Error (Rust 1.82.0 and earlier)**:
```
error: failed to parse manifest at `wit-bindgen-0.51.0/Cargo.toml`
Caused by:
  feature `edition2024` is required
  The package requires the Cargo feature called `edition2024`, but that feature
  is not stabilized in this version of Cargo (1.82.0).
```

**Cargo.lock Version 4 Error (Rust 1.85.0 and later)**:
```
error: failed to parse lock file at: programs/lutrii-recurring/Cargo.lock
Caused by:
  lock file version 4 requires `-Znext-lockfile-bump`
```

## Recommendations

1. **Immediate**: Build locally using Solana's bundled toolchain
2. **Short-term**: Create Docker-based build environment for reproducibility
3. **Long-term**: Monitor Solana CLI releases for lockfile v4 support, then upgrade

## Build Artifacts Location

When built successfully (locally):
- Programs: `target/deploy/*.so`
- Program keypairs: `target/deploy/*-keypair.json`
- IDL files: `target/idl/*.json`

## Last Updated
2026-02-09
