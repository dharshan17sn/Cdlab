# Demo: Redis Dead Feature Detector

This demo showcases the output of the tool when run on synthetic testcases demonstrating both successful detection and failure/edge cases.

## Showcase 1: Working Case (Complex Reachability)
In `testcases/tc5_complex_reachability.c`, we have two functions calling each other recursively (`recursive_a` and `recursive_b`), but neither is reachable from `main`. 

Standard compilers often miss this because the functions *appear* to be used by each other.

**Command:**
```bash
./run.sh testcases/tc5_complex_reachability.c
```

**Output:**
```
=================================================
    RUNNING DEAD FEATURE DETECTOR                
=================================================
[*] Target is a single file. Creating temporary workspace...
[*] Running Preprocessor Guard Mapper...
[*] Running Config Extractor...
[*] Generating LLVM IR for Project...
[*] Running Whole-Program Reachability Analysis...
    Linking all bitcode files...
    Analyzing whole_program.bc...
[*] Generating Report...
```

**Result (`dead_report.json`):**
```json
{
  "stats": {
    "dead_functions": 3,
    "dead_instructions": 12
  },
  "dead_features": [
    "recursive_a",
    "recursive_b",
    "entry_point"
  ]
}
```
*The tool successfully traces the call graph from `main`, determining that the recursive cluster is entirely dead.*

## Showcase 2: Failure / Edge Case (Indirect Function Pointers)
A known limitation of static whole-program analysis is resolving dynamic function pointers.
If a function is stored in an array or struct and called indirectly, static analysis might fail to prove it is dead or alive accurately.

**Hypothetical Code:**
```c
void plugin_init() { ... }
void (*callbacks[])() = { plugin_init };

int main() {
    callbacks[0]();
    return 0;
}
```

**What Happens:**
Because `DeadFeaturePass` might not statically trace the `callbacks` array through memory to the indirect call `callbacks[0]()`, it conservatively assumes `plugin_init` *could* be dead if it cannot prove the pointer is used. Alternatively, if the tool adopts a fully conservative approach (assuming any address-taken function is alive), it might fail to mark truly dead functions whose address is taken but never actually called.

This demonstrates the fundamental trade-off in static reachability analysis between precision and soundness.
