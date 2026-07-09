import os
import time
import sys

# Konfigurasi Path Relatif ke Direktori Target Dist
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "Portfolio-website", "dist"))
TARGET_FILE = os.path.join(DIST_DIR, "index.html")
UNAUTHORIZED_FILE = os.path.join(DIST_DIR, "unauthorized_test_file.txt")

def print_banner(text):
    print("\n" + "=" * 60)
    print(f" {text} ".center(60, "="))
    print("=" * 60 + "\n")

def check_env():
    if not os.path.exists(DIST_DIR):
        print(f"[ERROR] Direktori target tidak ditemukan: {DIST_DIR}")
        print("[INFO] Pastikan proyek Portfolio-website sudah dikompilasi (dist folder exists).")
        sys.exit(1)
    if not os.path.exists(TARGET_FILE):
        print(f"[ERROR] File index.html tidak ditemukan di: {TARGET_FILE}")
        sys.exit(1)

def run_modify_test():
    print_banner("SKENARIO 1: SIMULASI MODIFIKASI BERKAS (DEFACEMENT)")
    
    # 1. Simpan konten asli
    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        original_content = f.read()
    
    print("[*] Konten asli index.html berhasil dimuat.")
    print("[*] Mengubah konten file (menambahkan teks modifikasi)...")
    
    # 2. Modifikasi file dengan teks normal
    modified_content = original_content + "\n<!-- modifikasi-uji-integritas -->"
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(modified_content)
    
    print("[!] File index.html berhasil dimodifikasi.")
    print("[*] Menunggu 3 detik agar System Integrity Monitor mendeteksi dan memulihkan...")
    time.sleep(3.0)
    
    # 3. Cek pemulihan
    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        current_content = f.read()
        
    if current_content == original_content:
        print("\n==================================================")
        print("         TAMENG SELF-HEAL BERHASIL BEKERJA        ")
        print("==================================================")
        print("[PASS] File index.html otomatis dikembalikan ke kondisi asli!")
    else:
        print("\n==================================================")
        print("         TAMENG SELF-HEAL GAGAL BEKERJA           ")
        print("==================================================")
        print("[FAIL] File tetap berada dalam kondisi termodifikasi.")
        # Kembalikan manual jika gagal
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(original_content)

def run_delete_test():
    print_banner("SKENARIO 2: SIMULASI SABOTASE (PENGHAPUSAN BERKAS)")
    
    # 1. Simpan konten asli
    with open(TARGET_FILE, "r", encoding="utf-8") as f:
        original_content = f.read()
    
    print("[*] Konten asli index.html berhasil dimuat.")
    print("[*] Menghapus file index.html...")
    
    # 2. Hapus file
    os.remove(TARGET_FILE)
    print("[!] File index.html dihapus dari disk.")
    print("[*] Menunggu 3 detik agar System Integrity Monitor melakukan restorasi...")
    time.sleep(3.0)
    
    # 3. Cek pemulihan
    if os.path.exists(TARGET_FILE):
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            current_content = f.read()
        if current_content == original_content:
            print("\n==================================================")
            print("         TAMENG SELF-HEAL BERHASIL BEKERJA        ")
            print("==================================================")
            print("[PASS] File index.html otomatis direstorasi dengan konten asli!")
        else:
            print("\n==================================================")
            print("         TAMENG SELF-HEAL PARSIAL BEKERJA         ")
            print("==================================================")
            print("[WARN] File kembali ada, tetapi kontennya berbeda.")
    else:
        print("\n==================================================")
        print("         TAMENG SELF-HEAL GAGAL BEKERJA           ")
        print("==================================================")
        print("[FAIL] File index.html hilang dari server.")
        # Tulis ulang manual agar sistem normal
        with open(TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(original_content)

def run_untracked_file_test():
    print_banner("SKENARIO 3: SIMULASI PENYUSUPAN BERKAS ILEGAL")
    
    print("[*] Menulis berkas baru tidak dikenal ke direktori dist...")
    test_content = "nexus-integrity-test-file"
    
    # 2. Buat file baru
    with open(UNAUTHORIZED_FILE, "w", encoding="utf-8") as f:
        f.write(test_content)
        
    print(f"[!] Berkas baru dibuat di: {UNAUTHORIZED_FILE}")
    print("[*] Menunggu 3 detik agar System Integrity Monitor menghapus file ilegal...")
    time.sleep(3.0)
    
    # 3. Cek apakah terhapus
    if not os.path.exists(UNAUTHORIZED_FILE):
        print("\n==================================================")
        print("         TAMENG SELF-HEAL BERHASIL BEKERJA        ")
        print("==================================================")
        print("[PASS] Berkas ilegal otomatis dideteksi dan dihapus permanen!")
    else:
        print("\n==================================================")
        print("         TAMENG SELF-HEAL GAGAL BEKERJA           ")
        print("==================================================")
        print("[FAIL] Berkas ilegal masih terdeteksi di folder.")
        try:
            os.remove(UNAUTHORIZED_FILE)
        except:
            pass

def print_lan_guide():
    print_banner("PANDUAN UJI COBA JARINGAN LAN (KOMPUTER LAIN)")
    print("Untuk menguji ketahanan Nexus Cyber menggunakan komputer lain")
    print("dalam satu jaringan Wi-Fi/LAN yang sama, ikuti langkah berikut:\n")
    print("Langkah 1: Cari IP Lokal Komputer Host Anda")
    print("  - Buka cmd/PowerShell di komputer host ini, lalu jalankan:")
    print("      ipconfig")
    print("  - Cari alamat IPv4 pada adapter yang aktif (contoh: 192.168.1.15)\n")
    print("Langkah 2: Pastikan WAF Gateway Berjalan")
    print("  - Jalankan start-dev.bat pada komputer host ini.")
    print("  - Gateway akan mendengarkan port 8080 pada semua interface (0.0.0.0).\n")
    print("Langkah 3: Konfigurasi Firewall Windows (Jika Port Terblokir)")
    print("  - Jika port 8080 tidak bisa diakses dari luar, jalankan perintah")
    print("    berikut di PowerShell Administrator untuk membuka akses port:")
    print("      New-NetFirewallRule -DisplayName 'Nexus Gateway' -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow\n")
    print("Langkah 4: Akses dari Komputer Penguji (Client)")
    print("  - Sambungkan komputer penguji ke jaringan Wi-Fi/LAN yang sama.")
    print("  - Buka browser di komputer penguji, lalu akses:")
    print("      http://<IP_LOCAL_HOST>:8080/")
    print("  - Halaman portfolio akan terbuka melalui WAF Gateway.\n")
    print("Langkah 5: Lakukan Serangan dari Komputer Penguji")
    print("  - Coba kirim payload SQL Injection melalui browser komputer penguji:")
    print("      http://<IP_LOCAL_HOST>:8080/search?q='UNION+SELECT+null--"
    print("  - Anda akan melihat respons diblokir (403 Forbidden) oleh Gateway.")
    print("  - Aktivitas serangan akan muncul secara real-time di Dashboard SOC Host:")
    print("      http://localhost:3001/\n")

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    check_env()
    
    while True:
        print_banner("NEXUS CYBER: INTERACTIVE FILE INTEGRITY SELF-HEAL TEST")
        print("1. Jalankan Skenario 1 (Simulasi Deface / Modifikasi Berkas)")
        print("2. Jalankan Skenario 2 (Simulasi Sabotase / Penghapusan Berkas)")
        print("3. Jalankan Skenario 3 (Simulasi Penyusupan Berkas Ilegal)")
        print("4. Lihat Panduan Uji Coba Lintas Jaringan (Wi-Fi/LAN)")
        print("5. Keluar")
        
        choice = input("\nPilih menu [1-5]: ").strip()
        if choice == "1":
            run_modify_test()
        elif choice == "2":
            run_delete_test()
        elif choice == "3":
            run_untracked_file_test()
        elif choice == "4":
            print_lan_guide()
        elif choice == "5":
            print("\nExiting test suite.")
            break
        else:
            print("\nPilihan tidak valid. Silakan coba lagi.")
        
        input("\nTekan Enter untuk melanjutkan...")

if __name__ == "__main__":
    main()
