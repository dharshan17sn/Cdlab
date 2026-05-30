import sys
import json
import os

def generate_report():
    print("=================================================")
    print("              DEAD FEATURE REPORT                ")
    print("=================================================")
    
    # Load data
    try:
        with open("../config_extractor/config_status.json", 'r') as f:
            config = json.load(f)
        with open("../guard_mapper/guard_map.json", 'r') as f:
            guard = json.load(f)
        with open("dead_report.json", 'r') as f:
            report = json.load(f)
    except Exception as e:
        print("Error loading data files:", e)
        return

    dead_flags = config.get("dead", [])
    total_removable_loc = 0
    
    for df in dead_flags:
        print(f"Feature: {df}")
        print(f"Status : HIGH CONFIDENCE DEAD")
        print(f"Reason : No Makefile or compiler configuration enables flag")
        
        ranges = guard.get(df, [])
        feature_loc = 0
        if ranges:
            print("Files  :")
            for r in ranges:
                fname = os.path.basename(r["file"])
                print(f"  {fname} : lines {r['start']}-{r['end']}")
                # Calculate LOC (inclusive)
                feature_loc += (r['end'] - r['start'] + 1)
        else:
            print("Files  : None found in AST mapping")
            
        # Find blocks removed by LLVM (runtime checks)
        removed_blocks = 0
        for f in report.get("dead_features", []):
            if f["feature"] == df:
                removed_blocks = f["blocks_removed"]
                break
                
        print(f"Estimated removable LOC: {feature_loc}")
        if removed_blocks > 0:
            print(f"Dead IR Blocks (Runtime): {removed_blocks}")
        print("=================================================")
        
        total_removable_loc += feature_loc

    print("\n=================================================")
    print("               ANALYSIS SUMMARY                  ")
    print("=================================================")
    total_flags = len(config.get("active", [])) + len(dead_flags)
    
    stats = report.get("stats", {})
    dead_instr = stats.get("dead_instructions", 0)
    
    print(f"Feature Flags Analyzed : {total_flags}")
    print(f"Dead Features Found    : {len(dead_flags)}")
    print(f"Dead Functions (LLVM)  : {stats.get('dead_functions', 0)}")
    print(f"Potential LOC Removal  : {total_removable_loc}")
    
    # Rough estimate: 1 LOC ~ 30 bytes in binary (approx)
    kb_saving = (total_removable_loc * 30) / 1024.0
    print(f"Binary Reduction Est.  : {kb_saving:.2f} KB")
    print("=================================================")

if __name__ == "__main__":
    generate_report()
