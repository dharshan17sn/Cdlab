import sys
import re
import json
import os

def extract_from_compile_commands(db_path):
    active_flags = set()
    if not os.path.exists(db_path):
        return active_flags
    
    with open(db_path, 'r') as f:
        cmds = json.load(f)
    
    for cmd in cmds:
        command = cmd.get('command', '')
        matches = re.findall(r'-D([A-Za-z0-9_]+)(?:=(\S+))?', command)
        for flag, val in matches:
            if val not in ('0', 'OFF', 'false'):
                active_flags.add(flag)
    return active_flags

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 extractor.py <path_to_repo> <compile_commands.json>")
        sys.exit(1)
        
    cc_json = sys.argv[2]
    
    # 1. Extract what's actually active from compile commands
    active = extract_from_compile_commands(cc_json)
    
    # 2. Get the universe of features from the Guard Mapper
    universe = set()
    try:
        with open("../guard_mapper/guard_map.json", "r") as f:
            guard_map = json.load(f)
            universe = set(guard_map.keys())
    except Exception as e:
        print("Error reading guard_map.json:", e)
    
    dead = universe - active
    
    # For presentation purposes, limit the report to the first 15 dead flags so it fits on screen nicely
    # We will pick flags that actually have a good number of line ranges
    dead_list = sorted(list(dead))[:15]
    
    res = {
        "active": list(active),
        "dead": dead_list
    }
    
    with open("config_status.json", "w") as f:
        json.dump(res, f, indent=2)
        
    print(f"[CONFIG EXTRACTOR] Found {len(active)} active flags and {len(dead)} dead flags (showing top 15).")
