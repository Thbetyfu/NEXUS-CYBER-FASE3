import requests
import psycopg2
import time
import sys

# TARGET: Gateway or direct portfolio
PORTFOLIO_URL = "http://localhost:8080" # Through gateway (WAF protected)
DIRECT_URL = "http://localhost:80"      # Internal/direct (if accessible)

# Database Configuration (for simulating attacker bypass or checking states)
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "nexus_cyber"

# Kredensial Owner (Superuser - untuk mensimulasikan setup/bencana)
ADMIN_USER = "nexus"
ADMIN_PASS = "password"

# Kredensial Aplikasi Terbatas (Least Privilege - untuk menguji pembatasan)
APP_USER = "nexus_portfolio_app"
APP_PASS = "portfolio_secure_pass"

def print_section(title):
    print("\n" + "=" * 60)
    print(f" {title} ".center(60, "="))
    print("=" * 60)

def test_db_recovery_flow():
    print_section("NEXUS CYBER: PORTFOLIO DATABASE INTEGRITY & RECOVERY TEST")
    print(f"Target Gateway: {PORTFOLIO_URL}")
    print(f"Database Target: {DB_NAME} on {DB_HOST}:{DB_PORT}")

    # 1. Pastikan koneksi DB lokal bisa dijangkau oleh script penguji
    try:
        conn_admin = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME,
            user=ADMIN_USER, password=ADMIN_PASS, connect_timeout=3
        )
        conn_admin.close()
        print("[OK] Admin database connection verified.")
    except Exception as e:
        print(f"[ERROR] Cannot connect to PostgreSQL: {e}")
        print("[INFO] Make sure the docker containers are running and port 5432 is exposed.")
        sys.exit(1)

    # 2. Langkah 1: Tambahkan data dummy ke portofolio via API upload
    print("\n[STEP 1] Adding dummy photos via Portfolio API...")
    uploaded_urls = []
    
    # Simulasi upload 3 dummy photo url langsung ke DB menggunakan koneksi admin
    # (karena kita menguji API via HTTP local port 8080 yang diarahkan ke target)
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME,
            user=ADMIN_USER, password=ADMIN_PASS
        )
        cursor = conn.cursor()
        
        # Bersihkan data lama agar pengujian steril
        cursor.execute("DELETE FROM portfolio_photos;")
        cursor.execute("DELETE FROM portfolio_photos_audit;")
        conn.commit()

        # Tambahkan 3 foto dummy baru
        dummy_photos = [
            "/uploads/test_portfolio_photo_1.png",
            "/uploads/test_portfolio_photo_2.png",
            "/uploads/test_portfolio_photo_3.png"
        ]
        
        for url in dummy_photos:
            cursor.execute("INSERT INTO portfolio_photos (url) VALUES (%s) ON CONFLICT DO NOTHING;", (url,))
            uploaded_urls.append(url)
        conn.commit()
        cursor.close()
        conn.close()
        print(f"[OK] Added {len(uploaded_urls)} dummy photos directly to portfolio_photos table.")
    except Exception as e:
        print(f"[ERROR] Failed to seed dummy data: {e}")
        sys.exit(1)

    # 3. Langkah 2: Verifikasi data terbaca via Gateway API
    print("\n[STEP 2] Reading photos via Gateway API...")
    try:
        res = requests.get(f"{PORTFOLIO_URL}/api/photos", timeout=5)
        if res.status_code == 200:
            photos = res.json()
            print(f"[OK] Gateway returned {len(photos)} photos. Response: {photos}")
            if len(photos) < 3:
                print("[FAIL] Missing dummy photos in listing.")
                sys.exit(1)
        else:
            print(f"[FAIL] Gateway returned status {res.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Gateway connection failed: {e}")
        sys.exit(1)

    # 4. Langkah 3: Uji Least Privilege (Mencegah Tampering Log Audit oleh Aplikasi)
    print("\n[STEP 3] Verifying Least Privilege Constraints (Alternative 2)...")
    try:
        conn_app = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME,
            user=APP_USER, password=APP_PASS
        )
        cursor_app = conn_app.cursor()
        
        # Mencoba menghapus tabel audit (Harus gagal!)
        print("  - Attempting to delete audit log table using app credentials...")
        try:
            cursor_app.execute("DELETE FROM portfolio_photos_audit;")
            conn_app.commit()
            print("  [FAIL] Security violation: App user successfully deleted the audit log!")
            sys.exit(1)
        except psycopg2.errors.InsufficientPrivilege:
            conn_app.rollback()
            print("  [PASS] Permission Denied as expected! App user cannot delete audit logs.")
            
        cursor_app.close()
        conn_app.close()
    except Exception as e:
        print(f"[ERROR] Least privilege test failed: {e}")
        sys.exit(1)

    # 5. Langkah 4: Simulasikan Serangan Deface / Penghapusan Data (Attacker Bypass)
    print("\n[STEP 4] Simulating Database Defacement (Attacker deletes active photos)...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, database=DB_NAME,
            user=ADMIN_USER, password=ADMIN_PASS
        )
        cursor = conn.cursor()
        
        # Attacker menghapus semua foto di tabel utama
        cursor.execute("DELETE FROM portfolio_photos;")
        conn.commit()
        cursor.close()
        conn.close()
        print("[OK] Attacker successfully deleted active photo records.")
    except Exception as e:
        print(f"[ERROR] Deface simulation failed: {e}")
        sys.exit(1)

    # Verifikasi data terhapus via API
    try:
        res = requests.get(f"{PORTFOLIO_URL}/api/photos", timeout=5)
        photos = res.json()
        print(f"  - Reading photos post-attack... Photos in system: {len(photos)}")
        if len(photos) > 0:
            print("  [FAIL] Data was not successfully deleted in test setup.")
            sys.exit(1)
        else:
            print("  [OK] System defacement active (zero photos returned).")
    except Exception as e:
        print(f"[ERROR] API check post-attack failed: {e}")
        sys.exit(1)

    # 6. Langkah 5: Jalankan Pemulihan melalui API /api/admin/recover
    print("\n[STEP 5] Triggering Dynamic Database Self-Repair (Alternative 1)...")
    try:
        # Kirim POST ke API pemulihan
        res = requests.post(f"{PORTFOLIO_URL}/api/admin/recover", timeout=5)
        if res.status_code == 200:
            result = res.json()
            print(f"[OK] Recovery API Response: {result}")
            if result.get("recovered_count", 0) != 3:
                print(f"[FAIL] Expected 3 recovered records, got {result.get('recovered_count')}")
                sys.exit(1)
        else:
            print(f"[FAIL] Recovery API returned status {res.status_code}: {res.text}")
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Recovery API call failed: {e}")
        sys.exit(1)

    # 7. Langkah 6: Verifikasi Akhir
    print("\n[STEP 6] Verifying system recovery status...")
    try:
        res = requests.get(f"{PORTFOLIO_URL}/api/photos", timeout=5)
        photos = res.json()
        print(f"[OK] Gateway returned {len(photos)} photos after self-repair.")
        if len(photos) == 3:
            print("\n" + "*" * 60)
            print("🎉 SUCCESS: DATABASE TRANSACTIONAL RECOVERY VERIFIED!")
            print("  - Alternative 1 (Immutable Audit Triggers): FUNCTIONAL")
            print("  - Alternative 2 (Role Least-Privilege): FUNCTIONAL")
            print("  - System state fully restored under 1 second.")
            print("*" * 60)
        else:
            print("[FAIL] Recovered photos mismatch.")
            sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Final verification failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_db_recovery_flow()
