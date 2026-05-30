#!/bin/bash
set -e

echo "================================================="
echo "       DEAD FEATURE DETECTOR PIPELINE            "
echo "================================================="

ROOT_DIR=$(pwd)
TARGET_DIR="$ROOT_DIR/target_repo"

# Accept GIT_URL from command line arguments, fallback to default
if [ -n "$1" ]; then
    GIT_URL="$1"
else
    GIT_URL="https://github.com/redis/redis.git"
fi

echo "[*] Using Git URL: $GIT_URL"

echo "[*] Cleaning old repository..."
rm -rf "$TARGET_DIR"

echo "[*] Cloning Target Project (shallow clone)..."
git clone --depth 1 "$GIT_URL" "$TARGET_DIR" > /dev/null 2>&1

# 1. Guard Mapper MUST run first to find the universe of features
echo "[*] Running Preprocessor Guard Mapper..."
cd "$ROOT_DIR/src/guard_mapper"
python3 mapper.py "$TARGET_DIR"

# 2. Config Extractor
echo "[*] Running Config Extractor..."
cd "$ROOT_DIR/src/config_extractor"
# Pass a dummy compile_commands for now, relying on header parsing
python3 extractor.py "$TARGET_DIR" "dummy.json"


# 3. LLVM Pass Compilation
echo "[*] Compiling LLVM Pass..."
cd "$ROOT_DIR/src/llvm_passes"
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release > /dev/null
make -j$(nproc) > /dev/null
cd ../..

# 4. IR Generation
echo "[*] Generating Superset LLVM IR for Project (this might take a minute)..."
cd "$TARGET_DIR"
# Clean previous builds
make distclean > /dev/null 2>&1 || true

# Force Clang to emit LLVM bitcode (.bc) disguised as .o files. 
# We ignore the final linker error because we only need the bitcode files.
make CC="clang -emit-llvm -g -O0" CFLAGS="-DENABLE_EXPERIMENTAL_FLAGS=1" MALLOC=libc > /dev/null 2>&1 || true
# If make fails (e.g. no Makefile), fallback to compiling all C files directly
if [ ! -f "src/server.o" ] && [ ! -f "server.o" ] && [ ! -f "sds.o" ] && [ ! -f "memcached.o" ]; then
    find . -name "*.c" -exec clang -emit-llvm -c -g -O0 {} + 2>/dev/null || true
fi

echo "[+] IR Generation complete."

# 5. Reachability Analysis (Running the pass)
echo "[*] Running Whole-Program Reachability Analysis..."
cd "$ROOT_DIR/src/llvm_passes/build"

# Create an empty report first
echo "{\"stats\": {\"dead_functions\": 0, \"dead_instructions\": 0}, \"dead_features\": []}" > ../../dead_feature_reporter/dead_report.json

# Merge all bitcode files into a single whole-program IR file
echo "    Linking all bitcode files into whole_program.bc..."
find "$TARGET_DIR" -name "*.o" -o -name "*.bc" | xargs llvm-link-18 -o whole_program.bc 2>/dev/null || \
find "$TARGET_DIR" -name "*.o" -o -name "*.bc" | xargs llvm-link -o whole_program.bc 2>/dev/null || true

if [ -f "whole_program.bc" ]; then
    echo "    Analyzing whole_program.bc..."
    opt-18 -load-pass-plugin=./libDeadFeaturePass.so -passes="dead-feature-detector" -disable-output whole_program.bc 2>/dev/null || \
    opt -load-pass-plugin=./libDeadFeaturePass.so -passes="dead-feature-detector" -disable-output whole_program.bc 2>/dev/null || true
else
    echo "    [!] Failed to link bitcode."
fi

# 6. Dead Feature Reporter
cd "$ROOT_DIR/src/dead_feature_reporter"
python3 reporter.py
