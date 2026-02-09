#!/bin/bash

# Lutrii Devnet Deployment Script
# Deploys both programs to Solana devnet for testing

set -e

echo "🚀 Lutrii Devnet Deployment"
echo "=========================="
echo ""

# Configuration
CLUSTER="devnet"
RECURRING_PROGRAM="146BGDDLG4yRYXfNCCDdRRmCAYTrGddCgY14n4ekxJyF"
MERCHANT_REGISTRY_PROGRAM="3RkcL88V6dyHRCJFyGZ54R1u1KcHqeYB24MA38894Eex"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install it first."
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Please install it first."
    exit 1
fi

# Check Solana config
echo "🔍 Solana Configuration:"
solana config get

# Check wallet balance
echo ""
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance --url $CLUSTER | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo "⚠️  Low balance detected. You need at least 5 SOL for deployment."
    read -p "Request airdrop? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Requesting airdrop..."
        solana airdrop 2 --url $CLUSTER
        sleep 5
    fi
fi

# Build programs
echo ""
echo "🔨 Building programs..."
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
anchor build --arch sbf

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors first."
    exit 1
fi

# Verify build outputs
echo ""
echo "✅ Verifying build outputs..."
if [ ! -f "target/deploy/lutrii_recurring.so" ]; then
    echo "❌ lutrii_recurring.so not found"
    exit 1
fi

if [ ! -f "target/deploy/lutrii_merchant_registry.so" ]; then
    echo "❌ lutrii_merchant_registry.so not found"
    exit 1
fi

echo "✅ Build outputs verified"

# Deploy programs
echo ""
echo "🚀 Deploying programs to $CLUSTER..."
anchor deploy --provider.cluster $CLUSTER

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

# Verify deployments
echo ""
echo "✅ Verifying deployments..."
echo ""
echo "📦 Lutrii Recurring Program:"
solana program show $RECURRING_PROGRAM --url $CLUSTER

echo ""
echo "📦 Lutrii Merchant Registry Program:"
solana program show $MERCHANT_REGISTRY_PROGRAM --url $CLUSTER

# Copy IDLs
echo ""
echo "📄 Copying IDLs to mobile app..."
mkdir -p mobile/src/idl
cp target/idl/lutrii_recurring.json mobile/src/idl/
cp target/idl/lutrii_merchant_registry.json mobile/src/idl/
echo "✅ IDLs copied"

# Generate TypeScript types
echo ""
echo "📝 Generating TypeScript types..."
cd mobile
yarn install --silent
echo "✅ Types ready"

# Summary
echo ""
echo "════════════════════════════════════════"
echo "✅ Deployment Complete!"
echo "════════════════════════════════════════"
echo ""
echo "Program IDs:"
echo "  Recurring:         $RECURRING_PROGRAM"
echo "  Merchant Registry: $MERCHANT_REGISTRY_PROGRAM"
echo ""
echo "Cluster: $CLUSTER"
echo "Explorer: https://explorer.solana.com/address/$RECURRING_PROGRAM?cluster=$CLUSTER"
echo ""
echo "Next steps:"
echo "1. Update mobile app config with program IDs"
echo "2. Run mobile app tests: cd mobile && yarn test"
echo "3. Test on device: cd mobile && yarn android/ios"
echo ""
