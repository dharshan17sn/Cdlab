# Design: Redis Dead Feature Detector

## The Approach
The detector uses a hybrid architecture combining static source-level analysis (Python-based Preprocessor parsing) with whole-program analysis at the Intermediate Representation (IR) level (LLVM ModulePass).

### Phase 1: Source Pre-processing (`guard_mapper` & `config_extractor`)
C/C++ projects often use preprocessor macros (`#ifdef`, `#ifndef`) to enable or disable features based on a configuration file (like `config.h`). The first phase analyzes these guards and the active configuration to create a mapping of what features *should* be active.
- `guard_mapper`: Scans the target source code for macro-guarded blocks.
- `config_extractor`: Reads the project's build configuration to determine which macros are defined.

### Phase 2: Reachability Analysis (`llvm_passes`)
The target project is compiled into LLVM Bitcode (`.bc`). A custom LLVM Pass (`DeadFeaturePass`) analyzes the whole-program IR:
1. Constructing a complete Call Graph.
2. Starting from known entry points (e.g., `main`), it traverses the call graph to find all reachable functions.
3. Any function that is defined but never reached is marked as "dead".
4. Instructions within reachable functions that belong to basic blocks which are statically unreachable are also flagged.

### Phase 3: Reporting (`dead_feature_reporter`)
The final phase correlates the dead functions found by the LLVM Pass with the feature names identified in Phase 1 to produce a human-readable JSON report.

## Alternatives Considered

### 1. Clang AST Analysis
**Approach:** Parse the Abstract Syntax Tree using `libclang` to find uncalled functions.
**Why we rejected it:** AST analysis struggles with cross-file (translation unit) function calls and macros. Finding reachability across an entire large project (like Redis) using just AST requires essentially writing a full linker and symbol resolver. LLVM IR already handles this by linking bitcode files.

### 2. Dynamic Analysis (e.g. `gcov` / Code Coverage)
**Approach:** Compile with coverage flags, run tests, and whatever isn't covered is "dead".
**Why we rejected it:** Dynamic analysis is fundamentally limited by the test suite. If a feature is perfectly alive but lacks a test case, it will be falsely reported as dead. Static analysis proves that code *cannot* be reached, which is much safer for feature removal.
