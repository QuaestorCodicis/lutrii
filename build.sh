#!/bin/bash

# Lutrii Build Script
# Ensures correct environment for building Solana programs

set -e

export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "Building Lutrii programs..."
echo "Solana version: $(solana --version)"
echo "Anchor CLI version: $(anchor --version)"
echo "Rust version: $(rustc --version)"

cd "$(dirname "$0")"

# Clean previous builds
echo "Cleaning previous builds..."
anchor clean || true

# Build programs
echo "Building programs..."
anchor build --arch sbf

echo "Build complete!"
echo "IDLs generated in target/idl/"
echo "Programs built in target/deploy/"
