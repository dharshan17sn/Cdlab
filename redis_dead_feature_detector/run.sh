#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./run.sh <target_directory_or_file>"
    exit 1
fi

TARGET="$1"
ROOT_DIR=$(pwd)
SRC_DIR="$ROOT_DIR/src"

echo "================================================="
echo "    RUNNING DEAD FEATURE DETECTOR                "
echo "================================================="

# Create a temporary target directory if input is a single file
if [ -f "$TARGET" ]; then
    echo "[*] Target is a single file. Creating temporary workspace..."
    TEMP_DIR=$(mktemp -d)
    cp "$TARGET" "$TEMP_DIR/"
    TARGET_DIR="$TEMP_DIR"
elif [ -d "$TARGET" ]; then
    TARGET_DIR="$(cd "$TARGET" && pwd)"
else
    echo "Error: Target $TARGET is neither a file nor a directory."
    exit 1
fi

# 1. Guard Mapper
echo "[*] Running Preprocessor Guard Mapper..."
cd "$SRC_DIR/guard_mapper"
python3 mapper.py "$TARGET_DIR"

# 2. Config Extractor
echo "[*] Running Config Extractor..."
cd "$SRC_DIR/config_extractor"
python3 extractor.py "$TARGET_DIR" "dummy.json"

# 3. IR Generation
echo "[*] Generating LLVM IR for Project..."
cd "$TARGET_DIR"
if [ -f "Makefile" ]; then
    make distclean > /dev/null 2>&1 || true
    make CC="clang -emit-llvm -g -O0" CFLAGS="-DENABLE_EXPERIMENTAL_FLAGS=1" > /dev/null 2>&1 || true
fi
# Fallback to compiling all C files
find . -name "*.c" -exec clang -emit-llvm -c -g -O0 {} + 2>/dev/null || true

# 4. Reachability Analysis
echo "[*] Running Whole-Program Reachability Analysis..."
cd "$SRC_DIR/llvm_passes/build"
if [ ! -f "libDeadFeaturePass.so" ]; then
    echo "Error: libDeadFeaturePass.so not found. Did you run ./build.sh?"
    exit 1
fi

# Reset reporter output
echo "{\"stats\": {\"dead_functions\": 0, \"dead_instructions\": 0}, \"dead_features\": []}" > "$SRC_DIR/dead_feature_reporter/dead_report.json"

echo "    Linking all bitcode files..."
find "$TARGET_DIR" -name "*.o" -o -name "*.bc" | xargs llvm-link-18 -o whole_program.bc 2>/dev/null || \
find "$TARGET_DIR" -name "*.o" -o -name "*.bc" | xargs llvm-link -o whole_program.bc 2>/dev/null || true

if [ -f "whole_program.bc" ]; then
    echo "    Analyzing whole_program.bc..."
    opt-18 -load-pass-plugin=./libDeadFeaturePass.so -passes="dead-feature-detector" -disable-output whole_program.bc 2>/dev/null || \
    opt -load-pass-plugin=./libDeadFeaturePass.so -passes="dead-feature-detector" -disable-output whole_program.bc 2>/dev/null || true
else
    echo "    [!] Failed to link bitcode or no bitcode found."
fi

# 5. Dead Feature Reporter
echo "[*] Generating Report..."
cd "$SRC_DIR/dead_feature_reporter"
python3 reporter.py

# Cleanup temp dir if created
if [ -n "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

echo "[+] Done."
