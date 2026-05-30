# Evaluation

This document outlines the evaluation methodology and the performance of the Dead Feature Detector against a set of synthetic baselines representing real-world dead code scenarios.

## Methodology

We evaluate the tool against 5 test cases designed to test different types of reachability and preprocessor conditions.
The baseline comparison is performed against standard compiler warnings (e.g., `gcc -Wunused-function`). 

While standard compilers are capable of detecting simple uncalled static functions within a single file, they fail to detect:
1. Functions exported globally but never used across the whole program.
2. Complex cyclic dependencies (where functions call each other but are never called from `main`).
3. Preprocessor-level dead code that is omitted before compiling.

## Test Cases & Results

| Test Case | Description | Baseline (`-Wunused-function`) | Dead Feature Detector | Result |
|-----------|-------------|--------------------------------|-----------------------|--------|
| **TC1: Simple Dead Code** (`tc1_simple_dead_code.c`) | A standard uncalled function (`dead_func`). | Detected (if `static`), Missed (if global). | Detected successfully by traversing the LLVM Call Graph. | **PASS** |
| **TC2: Macro Guard** (`tc2_macro_guard.c`) | Code wrapped in an `#ifdef` that is not defined in the build config. | Missed. The compiler simply ignores the text. | Detected successfully by the `guard_mapper` pre-processor phase. | **PASS** |
| **TC3: Dead Helper Chain** (`tc3_dead_function.c`) | A dead function calling another helper function. | Missed. The compiler sees the helper is "used". | Detected successfully. Both functions are marked unreachable from `main`. | **PASS** |
| **TC4: Alive Feature** (`tc4_alive_feature.c`) | Two features called conditionally via `main`. | Correctly ignored. | Correctly ignored. | **PASS** |
| **TC5: Complex Reachability** (`tc5_complex_reachability.c`) | Functions calling each other recursively but completely disconnected from `main`. | Missed. Compiler considers both functions "used". | Detected successfully. The reachability BFS never reaches the recursive loop. | **PASS** |

## Conclusion
The Dead Feature Detector significantly outperforms standard compiler warnings by providing whole-program reachability analysis and pre-processor mapping, proving capable of detecting both syntactically dead and conditionally dead features across complex call graphs.
