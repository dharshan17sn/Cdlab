import sys
import re
import json
from pathlib import Path

def map_guards(source_dir):
    guard_map = {}
    
    # Catch both #ifdef MACRO and #if defined(MACRO)
    pattern = re.compile(r'^\s*#\s*(?:ifdef|if\s+defined\s*\()\s*([A-Za-z0-9_]+)')
    
    for ext in ['*.c', '*.cpp', '*.h', '*.hpp']:
        for path in Path(source_dir).rglob(ext):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                active_guards = [] # stack of (macro, start_line)
                
                for i, line in enumerate(lines):
                    line_num = i + 1
                    
                    match = pattern.search(line)
                    if match:
                        macro = match.group(1)
                        active_guards.append((macro, line_num))
                        
                    elif re.search(r'^\s*#\s*endif', line):
                        if active_guards:
                            macro, start_line = active_guards.pop()
                            if macro not in guard_map:
                                guard_map[macro] = []
                            guard_map[macro].append({
                                "file": str(path.resolve()),
                                "start": start_line,
                                "end": line_num
                            })
            except (UnicodeDecodeError, FileNotFoundError):
                pass
                
    return guard_map

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 mapper.py <path_to_repo>")
        sys.exit(1)
        
    repo_dir = sys.argv[1]
    gmap = map_guards(repo_dir)
    
    with open("guard_map.json", "w") as f:
        json.dump(gmap, f, indent=2)
        
    print(f"[GUARD MAPPER] Mapped {len(gmap)} features to source line ranges.")
