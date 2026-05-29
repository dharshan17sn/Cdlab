# Implementation Details

The core of the Dead Feature Detector relies on the LLVM compiler infrastructure. Here are the specific implementation details.

## IR Generation and Linking
To perform whole-program analysis, we cannot analyze individual source files (`.c` or `.cpp`) in isolation because a function defined in `file_A.c` might be called from `file_B.c`. 

We overcome this by:
1. Intercepting the build process (`make` or `find . -name "*.c"`) and instructing `clang` to emit LLVM bitcode instead of machine code (`-emit-llvm -c`).
2. Using `llvm-link` to combine all individual bitcode files into a single, massive `whole_program.bc`.

## The LLVM ModulePass (`DeadFeaturePass.cpp`)
The analysis is implemented as an LLVM "Pass" that runs over the `whole_program.bc`. 

### 1. Identifying Entry Points
The pass iterates through all functions in the module and identifies roots. The primary root is usually the `main` function. However, libraries might not have a `main` function, so we also consider functions with `__attribute__((constructor))` or explicitly exported functions as entry points.

### 2. Building the Call Graph & Reachability
We use a Worklist algorithm (Breadth-First Search) to trace reachability:
- We start by pushing the entry points onto a queue and marking them as `Visited`.
- While the queue is not empty, we pop a function and examine all its BasicBlocks and Instructions.
- If we find a `CallInst` or `InvokeInst`, we resolve the called function. If the called function hasn't been visited, we mark it as `Visited` and push it to the queue.
- **Handling Indirect Calls:** Function pointers present a challenge. If we see a call to an unresolved function pointer, our conservative static analysis approach assumes that *any* function whose address was taken could potentially be called.

### 3. Emitting the Results
After the traversal is complete, any function in the module that is not marked as `Visited` is definitively dead (unreachable). 
The pass writes these findings to a JSON report, detailing:
- The total number of functions.
- The name and location (file/line) of every dead function.
