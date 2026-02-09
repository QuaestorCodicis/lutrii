# Docker Build Instructions

**Quick way to build Lutrii using Docker (no local Rust/Anchor setup needed!)**

---

## Why Docker?

✅ **Clean environment** - No conflicts with local Rust versions
✅ **Reproducible** - Same build every time
✅ **No setup** - Just needs Docker installed
✅ **Fast** - Cached dependencies after first build
✅ **Official** - Uses Anchor's official build image

---

## Prerequisites

1. **Docker installed** ✅ (You have Docker 29.1.2)
2. **Docker running** ⏳ (Need to start Docker Desktop)

---

## Steps

### 1. Start Docker Desktop

```bash
# On macOS
open -a Docker

# Or click Docker icon in Applications folder
```

**Wait 30 seconds** for Docker to fully start.

### 2. Verify Docker is Running

```bash
docker info
```

If this shows Docker system info, you're ready!

### 3. Run the Build

```bash
cd /Users/dac/lutrii
./docker-build.sh
```

### 4. Wait for Build

First time: **~10 minutes** (downloading Anchor image + dependencies)
Subsequent builds: **~2-3 minutes** (cached)

You'll see:
```
🐳 Lutrii Docker Build
=====================

✅ Docker is ready

🔨 Building with Anchor Docker image...

Compiling lutrii-recurring...
Compiling lutrii-merchant-registry...

✅ Build successful!

📦 Build artifacts:
  Programs: lutrii_recurring.so (XXX KB)
           lutrii_merchant_registry.so (XXX KB)
  IDLs: lutrii_recurring.json
        lutrii_merchant_registry.json
```

---

## What Gets Built

After successful build, you'll have:

```
target/
├── deploy/
│   ├── lutrii_recurring.so              ← Compiled program
│   ├── lutrii_merchant_registry.so      ← Compiled program
│   ├── lutrii_recurring-keypair.json
│   └── lutrii_merchant_registry-keypair.json
├── idl/
│   ├── lutrii_recurring.json            ← Interface definition
│   └── lutrii_merchant_registry.json    ← Interface definition
└── types/
    └── ... (TypeScript type definitions)
```

---

## Next Steps After Build

### 1. Verify Build Output

```bash
ls -lh target/deploy/*.so
ls -la target/idl/*.json
```

### 2. Copy IDLs to Mobile

```bash
cp target/idl/*.json mobile/src/idl/
```

### 3. Deploy to Devnet

```bash
./scripts/deploy-devnet.sh
```

### 4. Initialize Platform

```bash
ts-node scripts/init-platform.ts
```

### 5. Run Tests

```bash
anchor test
```

---

## Alternative: Manual Docker Command

If the script doesn't work, run Docker manually:

```bash
docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  projectserum/build:v0.30.1 \
  anchor build
```

---

## Troubleshooting

### Error: "Cannot connect to Docker daemon"

**Problem**: Docker Desktop not running

**Solution**:
```bash
open -a Docker
sleep 30
docker info  # Verify it's running
```

### Error: "Unable to find image"

**Problem**: Need to pull the image first

**Solution**:
```bash
docker pull projectserum/build:v0.30.1
```

### Error: "No space left on device"

**Problem**: Docker out of disk space

**Solution**:
```bash
docker system prune -a
# This frees up space by removing unused images
```

### Build is very slow

**Normal on first run** - Docker needs to:
1. Pull ~2GB Anchor build image (one-time)
2. Download all Rust dependencies (one-time)
3. Compile programs (~2-3 minutes)

**Subsequent builds are much faster** - Docker caches everything!

---

## How It Works

1. **Docker image**: Uses `projectserum/build:v0.30.1`
   - Pre-configured with Anchor 0.30.1
   - Includes Solana toolchain
   - Has correct Rust version
   - All dependencies pre-installed

2. **Volume mount**: `-v $(pwd):/workspace`
   - Your local files accessible in container
   - Build artifacts written to local `target/`

3. **Command**: `anchor build`
   - Compiles both programs
   - Generates IDLs automatically
   - Creates `.so` files

---

## Benefits of This Approach

✅ **No local Rust installation needed**
✅ **No Anchor version conflicts**
✅ **Reproducible builds** - same result every time
✅ **Clean environment** - isolated from your system
✅ **Official tooling** - maintained by Anchor team
✅ **Cache-friendly** - fast after first build

---

## Disk Space

- **First time**: ~2.5 GB (Anchor image + dependencies)
- **After build**: ~3 GB total
- **Subsequent builds**: No additional space

---

## Build Time Expectations

| Build | Time | Why |
|-------|------|-----|
| First time | ~10 min | Downloading image + deps |
| Code change | ~2-3 min | Only recompiles changed code |
| Clean build | ~3-4 min | Full recompile, cached deps |
| CI/CD | ~10 min | Fresh environment each time |

---

## Quick Reference

```bash
# Start Docker
open -a Docker && sleep 30

# Verify Docker
docker info

# Pull image (optional, done automatically)
docker pull projectserum/build:v0.30.1

# Build
./docker-build.sh

# Or manually
docker run --rm -v $(pwd):/workspace -w /workspace \
  projectserum/build:v0.30.1 anchor build

# Verify output
ls -lh target/deploy/*.so target/idl/*.json

# Deploy
./scripts/deploy-devnet.sh
```

---

## What If Docker Doesn't Work?

If Docker absolutely won't work on your system, you have options:

1. **GitHub Actions** - Push to GitHub, build in CI
2. **Hire expert** - $200-400 for 1-2 hours on Upwork
3. **Solana Discord** - Ask in #dev-support
4. **Cloud VM** - Spin up Linux VM, build there

But **Docker is by far the easiest and most reliable approach**.

---

## Ready?

```bash
# 1. Start Docker Desktop
open -a Docker

# 2. Wait a moment
sleep 30

# 3. Build!
cd /Users/dac/lutrii
./docker-build.sh
```

**Your production-ready Solana programs will be built in ~10 minutes!** 🚀

---

*All the code is ready. Just waiting for the build!*
