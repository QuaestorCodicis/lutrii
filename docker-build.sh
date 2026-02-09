#!/bin/bash

# Docker-based build script for Lutrii
# This provides a clean, reproducible build environment

set -e

echo "🐳 Lutrii Docker Build"
echo "====================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop:"
    echo "   https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is ready"
echo ""

# Option 1: Build using Docker run (quickest)
echo "🔨 Building with Anchor Docker image..."
echo ""

docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  backpackapp/build:v0.30.1 \
  anchor build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📦 Build artifacts:"
    ls -lh target/deploy/*.so 2>/dev/null || echo "  Programs: Not found"
    ls -la target/idl/*.json 2>/dev/null || echo "  IDLs: Not found"
    echo ""
    echo "Next steps:"
    echo "  1. Verify IDLs: ls -la target/idl/"
    echo "  2. Deploy to devnet: ./scripts/deploy-devnet.sh"
    echo "  3. Copy IDLs to mobile: cp target/idl/*.json mobile/src/idl/"
else
    echo ""
    echo "❌ Build failed. Check the output above for errors."
    exit 1
fi
