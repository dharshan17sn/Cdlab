# Dead Feature Detector

A tool that identifies dead or unreachable features in C/C++ codebases by combining preprocessor macro analysis with LLVM-based whole-program reachability analysis.

## What it does

Dead Feature Detector analyzes your repository to find features (code blocks, functions) that are compiled but can never be executed, or features that are entirely disabled by configuration macros but still exist in the codebase. It helps in:

- Identifying stale code that can be safely removed.
- Validating if `#ifdef` blocks are properly managed by `configure` scripts.
- Reducing technical debt.

## How it works

1. `run.sh` scans the target project and extracts preprocessor configuration from build files.
2. The code is compiled into LLVM Bitcode (`.bc`) using the configured compiler and build options.
3. The LLVM bitcode is linked and passed through the custom `DeadFeaturePass`.
4. The pass analyzes reachability and outputs a JSON report of dead features, unreachable functions, and disabled code paths.

## Prerequisites

- Linux / WSL
- Python 3.8+
- LLVM 18 (`llvm-18`, `clang-18`)
- CMake

## Build

Compile the LLVM pass and setup the project:

```bash
./build.sh
```

## Run the detector

Run the tool against any C project directory or a single C file:

```bash
./run.sh /path/to/your/project
```

Run against a specific testcase:

```bash
./run.sh testcases/tc1_simple_dead_code.c
```

## Evaluate the Redis case

The repository includes an evaluation script for the Redis detector.
Make it executable and run it from the `redis_dead_feature_detector` directory:

```bash
bash -c "chmod +x evaluation/evaluate_redis.sh && evaluation/evaluate_redis.sh"
```

This will execute the evaluation flow for the Redis analysis and report the results.

## Recommended files for submission

For company submission, keep this README and the implementation files. The additional design/demo/evaluation/implementation markdown files are redundant and can be removed to simplify the package.
