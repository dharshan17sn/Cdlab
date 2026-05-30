#!/bin/bash
set -e

echo "================================================="
echo "    BUILDING DEAD FEATURE DETECTOR               "
echo "================================================="

ROOT_DIR=$(pwd)
LLVM_PASS_DIR="$ROOT_DIR/src/llvm_passes"

if [ ! -d "$LLVM_PASS_DIR" ]; then
    echo "Error: src/llvm_passes directory not found."
    exit 1
fi

echo "[*] Compiling LLVM Pass..."
cd "$LLVM_PASS_DIR"
rm -rf build
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)

echo "[+] Build complete. LLVM Pass is ready in src/llvm_passes/build/libDeadFeaturePass.so"
