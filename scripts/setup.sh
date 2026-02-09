#!/bin/bash

# Lutrii Setup Script
# This script helps you get started with development

set -e

echo "🎉 Welcome to Lutrii!"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Solana is installed
if ! command -v solana &> /dev/null; then
    echo -e "${YELLOW}⚠️  Solana CLI not found. Installing...${NC}"
    sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
else
    echo -e "${GREEN}✅ Solana CLI installed${NC}"
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${YELLOW}⚠️  Anchor not found. Installing...${NC}"
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install 0.29.0
    avm use 0.29.0
else
    echo -e "${GREEN}✅ Anchor installed${NC}"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 20+ first.${NC}"
    echo "Visit: https://nodejs.org/"
    exit 1
else
    echo -e "${GREEN}✅ Node.js installed${NC}"
fi

# Check if Yarn is installed
if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}⚠️  Yarn not found. Installing...${NC}"
    npm install -g yarn
else
    echo -e "${GREEN}✅ Yarn installed${NC}"
fi

echo ""
echo "📦 Installing dependencies..."
echo "================================"

# Install root dependencies
echo "Installing root dependencies..."
yarn install

# Install mobile dependencies
echo "Installing mobile app dependencies..."
cd mobile && yarn install && cd ..

echo ""
echo "🔧 Setting up Solana..."
echo "================================"

# Configure Solana to devnet
solana config set --url devnet
echo -e "${GREEN}✅ Configured Solana CLI to devnet${NC}"

# Check if wallet exists
if [ ! -f ~/.config/solana/id.json ]; then
    echo -e "${YELLOW}⚠️  No Solana wallet found. Creating one...${NC}"
    solana-keygen new --no-bip39-passphrase
fi

# Get wallet address
WALLET=$(solana address)
echo -e "${GREEN}✅ Wallet address: $WALLET${NC}"

# Airdrop SOL if balance is low
BALANCE=$(solana balance | awk '{print $1}')
if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "💰 Airdropping 2 SOL for development..."
    solana airdrop 2 || echo -e "${YELLOW}⚠️  Airdrop failed. Request SOL manually from https://faucet.solana.com${NC}"
fi

echo ""
echo "🏗️  Building smart contracts..."
echo "================================"

# Build Anchor programs
anchor build

echo ""
echo "🧪 Running tests..."
echo "================================"

# Run Anchor tests
anchor test --skip-local-validator

echo ""
echo "✨ Setup complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "  1. Deploy to devnet:"
echo "     ${YELLOW}anchor deploy --provider.cluster devnet${NC}"
echo ""
echo "  2. Initialize platform:"
echo "     ${YELLOW}ts-node scripts/initialize.ts${NC}"
echo ""
echo "  3. Run mobile app:"
echo "     ${YELLOW}cd mobile && yarn android${NC}"
echo ""
echo "  4. Read the implementation guide:"
echo "     ${YELLOW}cat IMPLEMENTATION_GUIDE.md${NC}"
echo ""
echo "🎯 Happy building! Let's make Lutrii the must-have Solana Mobile app!"
