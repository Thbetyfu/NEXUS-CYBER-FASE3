import os
import sys

def check_structure():
    print("[NEXUS] Nexus Cyber - Scaffold Verification Script")
    print("-" * 50)
    
    required_dirs = [
        "nexus-core-gateway/cmd/gateway",
        "nexus-core-gateway/internal/ai",
        "nexus-core-gateway/internal/mtd",
        "nexus-core-gateway/internal/avse",
        "nexus-core-gateway/internal/proxy",
        "nexus-core-gateway/internal/repair",
        "nexus-admin-dashboard/src/app",
        ".agents/skills/dual-brain",
        ".agents/skills/qa-iso-auditor",
        "scripts",
        "docs"
    ]
    
    missing = []
    # Dynamic workspace root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_path = os.path.abspath(os.path.join(script_dir, "..", ".."))
    
    for d in required_dirs:
        full_path = os.path.join(base_path, d)
        if os.path.exists(full_path):
            print(f"[OK] {d:.<40} FOUND")
        else:
            print(f"[FAIL] {d:.<40} MISSING")
            missing.append(d)
            
    print("-" * 50)
    if not missing:
        print("[PASS] SCAFFOLD INTEGRITY: 100% - ALL SYSTEMS GO")
        return True
    else:
        print(f"[FAIL] MISSING {len(missing)} COMPONENTS.")
        return False

if __name__ == "__main__":
    success = check_structure()
    if not success:
        sys.exit(1)
