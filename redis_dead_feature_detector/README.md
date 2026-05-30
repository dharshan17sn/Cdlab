# Dead Feature Detector

A tool that identifies dead or unreachable features in C/C++ codebases by combining preprocessor macro analysis with LLVM-based whole-program reachability analysis.

## What it does
Dead Feature Detector analyzes your repository to find features (code blocks, functions) that are compiled but can never be executed, or features that are entirely disabled by configuration macros but still exist in the codebase. It helps in:
- Identifying stale code that can be safely removed.
- Validating if `#ifdef` blocks are properly managed by `configure` scripts.
- Reducing technical debt.

## Prerequisites
- Linux / WSL
- Python 3.8+
- LLVM 18 (`llvm-18`, `clang-18`)
- CMake

## How to Build
Simply run the build script to compile the LLVM passes:
```bash
./build.sh
```

## How to Run
Run the tool against any C project directory or a single C file:
```bash
./run.sh /path/to/your/project
```
Or run against a specific testcase:
```bash
./run.sh testcases/tc1_simple_dead_code.c
```

The script will:
1. Extract the preprocessor macros and configurations.
2. Compile your project into LLVM Bitcode (`.bc`).
3. Link the bitcode and run the custom `DeadFeaturePass`.
4. Output a JSON report containing the list of dead features and unreachable functions.
