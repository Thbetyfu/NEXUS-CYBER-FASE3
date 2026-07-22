import os
import time
import sys

# Target directory templates to monitor
TARGET_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../playground/vulnerable-ojk-portal/templates/index.html"))
UNAUTHORIZED_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../playground/vulnerable-ojk-portal/templates/unauthorized_test_file.txt"))

# ANSI Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def test_modification():
    print(f"\n{BLUE}[TEST 1] Testing Web Defacement Restoration (Modification Rollback)...{RESET}")
    
    if not os.path.exists(TARGET_FILE):
        print(f"{RED}[!] Error: Protected template file not found at: {TARGET_FILE}{RESET}")
        sys.exit(1)
        
    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        original_content = f.read()
        
    print(f"[*] Read original content ({len(original_content)} bytes)")
    
    # Simulate modification with benign text
    malicious_content = "<!-- Integrity test modification --><p>Modified content for testing purposes.</p>"
    print(f"{RED}[!] Simulating Defacement: Modifying template file...{RESET}")
    start_time = time.time()
    
    try:
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(malicious_content)
    except Exception as e:
        print(f"{RED}[!] Failed to write modified content: {e}{RESET}")
        sys.exit(1)
        
    # Poll for restoration
    restored = False
    duration = 0
    for _ in range(50): # Max 5 seconds
        time.sleep(0.1)
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            current_content = f.read()
        if current_content == original_content:
            duration = (time.time() - start_time) * 1000
            restored = True
            break
            
    if restored:
        print(f"{GREEN}[SUCCESS] Website visual repaired successfully to baseline!{RESET}")
        print(f"{GREEN}[SUCCESS] Instant Rollback latency: {duration:.2f} ms (Target < 2000 ms){RESET}")
        return True
    else:
        print(f"{RED}[FAIL] File was not restored back to original within 5 seconds.{RESET}")
        # Try to restore it manually just in case
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(original_content)
        return False

def test_deletion():
    print(f"\n{BLUE}[TEST 2] Testing File Deletion Recovery...{RESET}")
    
    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        original_content = f.read()
        
    print(f"{RED}[!] Simulating File Deletion: Removing templates/index.html...{RESET}")
    start_time = time.time()
    
    try:
        os.remove(TARGET_FILE)
    except Exception as e:
        print(f"{RED}[!] Failed to delete file: {e}{RESET}")
        sys.exit(1)
        
    # Poll for recovery
    recovered = False
    duration = 0
    for _ in range(50): # Max 5 seconds
        time.sleep(0.1)
        if os.path.exists(TARGET_FILE):
            with open(TARGET_FILE, "r", encoding="utf-8") as f:
                current_content = f.read()
            if current_content == original_content:
                duration = (time.time() - start_time) * 1000
                recovered = True
                break
                
    if recovered:
        print(f"{GREEN}[SUCCESS] Deleted template file recreated and restored successfully!{RESET}")
        print(f"{GREEN}[SUCCESS] Deletion recovery latency: {duration:.2f} ms{RESET}")
        return True
    else:
        print(f"{RED}[FAIL] File was not recreated back to original within 5 seconds.{RESET}")
        # Recreate manually
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(original_content)
        return False

def test_webshell_upload():
    print(f"\n{BLUE}[TEST 3] Testing Unauthorized File Upload (Untracked file block)...{RESET}")
    
    print(f"{RED}[!] Simulating unauthorized file upload: Creating templates/unauthorized_test_file.txt...{RESET}")
    start_time = time.time()
    
    try:
        with open(UNAUTHORIZED_FILE, "w") as f:
            f.write("unauthorized file content")
    except Exception as e:
        print(f"{RED}[!] Failed to create unauthorized file: {e}{RESET}")
        sys.exit(1)
        
    # Poll for deletion
    deleted = False
    duration = 0
    for _ in range(50): # Max 5 seconds
        time.sleep(0.1)
        if not os.path.exists(UNAUTHORIZED_FILE):
            duration = (time.time() - start_time) * 1000
            deleted = True
            break
            
    if deleted:
        print(f"{GREEN}[SUCCESS] Unauthorized file detected and deleted automatically!{RESET}")
        print(f"{GREEN}[SUCCESS] Elimination latency: {duration:.2f} ms{RESET}")
        return True
    else:
        print(f"{RED}[FAIL] Untracked file was not removed within 5 seconds.{RESET}")
        if os.path.exists(UNAUTHORIZED_FILE):
            os.remove(UNAUTHORIZED_FILE)
        return False

if __name__ == "__main__":
    print(f"{YELLOW}{'='*60}")
    print(f"{'NEXUS CYBER: INTEGRITY MONITOR & SELF-HEALING TEST'.center(60)}")
    print(f"{'='*60}{RESET}")
    
    # Verify gateway is running
    print("[*] Checking if Nexus Cyber Gateway is active on localhost:8080...")
    try:
        import requests
        res = requests.get("http://localhost:8080/api/ai/status", timeout=2)
        print(f"{GREEN}[*] Gateway is ONLINE. Proceeding with tests.{RESET}")
    except Exception:
        print(f"{RED}[!] Warn: Gateway does not seem to be running on http://localhost:8080.")
        print(f"{RED}[!] Please make sure the Gateway is active in order for logs to be broadcasted to the dashboard.{RESET}")
        print(f"{YELLOW}[*] Proceeding with file-system level tests...{RESET}")
        
    success = True
    success &= test_modification()
    success &= test_deletion()
    success &= test_webshell_upload()
    
    print(f"\n{YELLOW}{'='*60}")
    if success:
        print(f"{GREEN}{'ALL SYSTEM INTEGRITY TESTS PASSED SUCCESSFULLY!'.center(60)}{RESET}")
    else:
        print(f"{RED}{'SOME INTEGRITY TESTS FAILED.'.center(60)}{RESET}")
    print(f"{YELLOW}{'='*60}{RESET}")
    
    if not success:
        sys.exit(1)
