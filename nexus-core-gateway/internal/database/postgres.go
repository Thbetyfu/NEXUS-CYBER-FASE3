// Package database mengelola koneksi persistensi PostgreSQL untuk menyimpan telemetri keamanan dan audit trail.
// Mematuhi standar ISO 27001 (Kontrol A.12.4 - Logging dan Pemantauan) untuk memastikan log audit siber
// disimpan secara permanen, terstruktur, dan tidak dapat dimanipulasi dengan mudah.
package database

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nexus-cyber/nexus-core-gateway/internal/bpf"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"github.com/oschwald/geoip2-golang"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB adalah referensi singleton global untuk koneksi database GORM PostgreSQL.
var DB *gorm.DB

// Fallback in-memory blacklist for degraded mode when DB is nil
var LocalBlacklist sync.Map

// InitPostgres menginisialisasi pool koneksi database PostgreSQL dan menjalankan migrasi skema otomatis.
//
// Alasan Arsitektural (Why):
// - Jika environment `POSTGRES_DSN` kosong, sistem mengalami degradasi anggun (degraded mode) tanpa crash,
//   memungkinkan gateway beroperasi dalam mode in-memory/cache (ISO 25010 - Fault Tolerance).
// - Menggunakan Auto-Migrate untuk memastikan tabel audit trail penting seperti ThreatLog dan MTDAuditTrail
//   selalu sinkron dengan struktur data terbaru saat gateway pertama kali dijalankan.
func InitPostgres() {
	InitThreatReporter()
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		log.Println("[DB-WARNING] POSTGRES_DSN is not set. Database persistence is disabled (Degraded Local Mode).")
		return
	}

	// Membuka koneksi pool dengan logger Warn untuk menghemat I/O disk dari pencatatan query SELECT yang berlebihan.
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("[DB-ERROR] Failed to connect to PostgreSQL: %v", err)
	}

	log.Println("[DB-INIT] Successfully connected to PostgreSQL.")

	// Auto-Migrate Tabel Forensik dan Log Keamanan untuk pemenuhan standar kepatuhan BSSN & OJK (ISO 27001).
	log.Println("[DB-INIT] Running Auto-Migrations for ISO 27001 Schema...")
	err = db.AutoMigrate(
		&models.ThreatLog{},
		&models.MTDAuditTrail{},
		&models.IntelBlacklist{},
		&models.AIInsight{},
		&models.DomainSubscription{},
		// [NEW] Audit trail untuk setiap antibodi zero-day yang dipelajari NEX-AI secara otonom (Self-Healing Log)
		&models.AntibodyAudit{},
	)
	if err != nil {
		log.Fatalf("[DB-ERROR] Failed to run migrations: %v", err)
	}

	log.Println("[DB-INIT] Auto-Migrations completed successfully.")
	DB = db
}

// IsIPBlacklisted memeriksa apakah IP penyerang terdaftar dalam daftar hitam (blacklist) yang masih aktif.
//
// Alasan Teknis (Why):
// Penyerang sering memalsukan port sumber (source port) untuk melewati pemeriksaan keamanan.
// Fungsi ini melakukan normalisasi IP (stripping port) dengan membuang tanda titik dua ":" dan nomor port di belakangnya
// sebelum melakukan query. Ini menjamin pemblokiran IP bersifat mutlak tanpa peduli port mana yang digunakan peretas.
func IsIPBlacklisted(ip string) bool {
	// Normalisasi IP: Potong port jika ada (misal "192.168.1.10:49281" -> "192.168.1.10")
	if idx := strings.Index(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}

	// 1. Cek local in-memory blacklist
	if val, ok := LocalBlacklist.Load(ip); ok {
		if expiresAt, ok2 := val.(time.Time); ok2 {
			if time.Now().Before(expiresAt) {
				return true
			}
			// Kedaluwarsa, hapus
			LocalBlacklist.Delete(ip)
		} else {
			// Permanent ban di memori local
			return true
		}
	}

	if DB == nil {
		return false
	}

	var blacklist models.IntelBlacklist
	now := time.Now()
	
	// Query dioptimalkan dengan memverifikasi masa berlaku blacklist (expires_at) secara real-time.
	result := DB.Where("ip_address = ? AND is_active = true AND (expires_at IS NULL OR expires_at > ?)", ip, now).First(&blacklist)
	return result.Error == nil
}

// BanIP menambahkan IP ke daftar hitam di database dan RAM local.
//
// Alasan Arsitektural (Why):
// 1. IP yang diblokir harus disimpan di memori RAM local (LocalBlacklist) untuk pengecekan O(1) super cepat pada WAF middleware
//    tanpa perlu melakukan query SQL di setiap request masuk yang dapat memperlambat gerbang proxy secara ekstrem.
// 2. Memanggil bpfManager.BlockIP untuk memprogram XDP_DROP tingkat driver jaringan, sehingga lalu lintas dari IP ini
//    dapat dijatuhkan seketika oleh kernel sebelum diproses di user-space, mengeliminasi CPU/memory amplification attack.
// 3. Menyimpan data di PostgreSQL guna memenuhi klausul log audit ISO 27001 untuk pelaporan kepatuhan keamanan (ISMS).
// GeoIPResponse models the json response of the ip-api.com lookup API.
type GeoIPResponse struct {
	Status      string  `json:"status"`
	Country     string  `json:"country"`
	City        string  `json:"city"`
	ISP         string  `json:"isp"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
}

// GetIPGeoInfo performs dynamic GeoIP lookup for an IP address.
func GetIPGeoInfo(ip string) (country, city, isp string, lat, lon float64) {
	if ip == "127.0.0.1" || ip == "localhost" || strings.HasPrefix(ip, "192.168.") || strings.HasPrefix(ip, "10.") || strings.HasPrefix(ip, "172.") {
		return "Indonesia", "Bandung", "Telkom Indonesia", -6.9175, 107.6191
	}

	// 1. Coba pencarian lokal dengan database GeoLite2 MaxMind jika tersedia
	dbPath := "geoip/GeoLite2-City.mmdb"
	if _, err := os.Stat(dbPath); err == nil {
		db, err := geoip2.Open(dbPath)
		if err == nil {
			defer db.Close()
			netIP := net.ParseIP(ip)
			if netIP != nil {
				record, err := db.City(netIP)
				if err == nil {
					country = record.Country.Names["en"]
					city = record.City.Names["en"]
					if country == "" {
						country = "Unknown"
					}
					if city == "" {
						city = "Unknown"
					}
					lat = record.Location.Latitude
					lon = record.Location.Longitude
					isp = "MaxMind Local DB"
					return country, city, isp, lat, lon
				}
			}
		}
	}

	// Log warning bahwa database lokal mmdb absen atau gagal dibaca, fallback ke API online
	log.Printf("[GEOIP-WARN] Local mmdb database not found or unreadable. Falling back to online API for IP: %s", ip)

	// 2. Fallback ke API online ip-api.com
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get("http://ip-api.com/json/" + ip)
	if err != nil {
		return "Unknown", "Unknown", "Unknown", 0.0, 0.0
	}
	defer resp.Body.Close()

	var geo GeoIPResponse
	if err := json.NewDecoder(resp.Body).Decode(&geo); err != nil || geo.Status != "success" {
		return "Unknown", "Unknown", "Unknown", 0.0, 0.0
	}

	return geo.Country, geo.City, geo.ISP, geo.Lat, geo.Lon
}

// BanIP menambahkan IP ke daftar hitam di database dan RAM local.
//
// Alasan Arsitektural (Why):
// 1. IP yang diblokir harus disimpan di memori RAM local (LocalBlacklist) untuk pengecekan O(1) super cepat pada WAF middleware
//    tanpa perlu melakukan query SQL di setiap request masuk yang dapat memperlambat gerbang proxy secara ekstrem.
// 2. Memanggil bpfManager.BlockIP untuk memprogram XDP_DROP tingkat driver jaringan, sehingga lalu lintas dari IP ini
//    dapat dijatuhkan seketika oleh kernel sebelum diproses di user-space, mengeliminasi CPU/memory amplification attack.
// 3. Menyimpan data di PostgreSQL guna memenuhi klausul log audit ISO 27001 untuk pelaporan kepatuhan keamanan (ISMS).
func BanIP(ip string, reason string, duration time.Duration) {
	if idx := strings.Index(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}

	var expiresAt *time.Time
	if duration > 0 {
		exp := time.Now().Add(duration)
		expiresAt = &exp
		LocalBlacklist.Store(ip, exp)
	} else {
		LocalBlacklist.Store(ip, true) // Permanent
	}

	// Register in eBPF map for kernel-level driver dropping (XDP_DROP)
	bpfManager := bpf.NewBpfManager()
	_ = bpfManager.BlockIP(ip)

	// Laporkan ancaman secara asinkron ke provider aktif (AbuseIPDB / SIEM)
	var categories []int
	if strings.Contains(strings.ToLower(reason), "brute") || strings.Contains(strings.ToLower(reason), "vault") {
		categories = []int{18, 15}
	} else {
		categories = []int{15}
	}
	if ActiveThreatReporter != nil {
		_ = ActiveThreatReporter.ReportThreat(ip, categories, fmt.Sprintf("Nexus-Cyber WAF: Blocked due to '%s'", reason))
	}

	if DB == nil {
		return
	}

	// Dapatkan info geografis IP
	country, city, isp, lat, lon := GetIPGeoInfo(ip)

	// Cek apakah data blacklist sudah ada
	var blacklist models.IntelBlacklist
	err := DB.Where("ip_address = ?", ip).First(&blacklist).Error
	if err != nil {
		blacklist = models.IntelBlacklist{
			Base:      models.Base{ID: uuid.New()},
			IPAddress: ip,
			Reason:    reason,
			ExpiresAt: expiresAt,
			IsActive:  true,
			Country:   country,
			City:      city,
			ISP:       isp,
			Latitude:  lat,
			Longitude: lon,
		}
		DB.Create(&blacklist)
	} else {
		DB.Model(&blacklist).Updates(map[string]interface{}{
			"is_active":  true,
			"reason":     reason,
			"expires_at": expiresAt,
			"country":    country,
			"city":       city,
			"isp":        isp,
			"latitude":   lat,
			"longitude":  lon,
		})
	}
}

// UnbanIP menghapus IP dari daftar hitam di database dan RAM local.
//
// Alasan Arsitektural (Why):
// 1. Membersihkan memori RAM local (LocalBlacklist) agar host dapat kembali berinteraksi dengan gateway secara instan.
// 2. Memanggil bpfManager.UnblockIP untuk menghapus entri dari tabel kernel eBPF (mengembalikan aksi ke XDP_PASS).
// 3. Melakukan pembaruan non-destruktif di database PostgreSQL (mengubah is_active ke false) alih-alih menghapus barisnya,
//    agar jejak audit forensik tentang kapan pemblokiran dilakukan dan dicabut tetap tersimpan untuk keperluan audit kepatuhan.
func UnbanIP(ip string) {
	if idx := strings.Index(ip, ":"); idx != -1 {
		ip = ip[:idx]
	}

	LocalBlacklist.Delete(ip)

	// Remove from eBPF map to restore network access (XDP_PASS)
	bpfManager := bpf.NewBpfManager()
	_ = bpfManager.UnblockIP(ip)

	if DB == nil {
		return
	}

	DB.Model(&models.IntelBlacklist{}).
		Where("ip_address = ?", ip).
		Update("is_active", false)
}

// SaveAIInsight menyimpan hasil analisis forensik kustom dari NEX-AI ke database.
//
// Alasan Arsitektural (Why):
// Hasil pemikiran AI (AI Insight) disimpan dalam tabel terpisah yang berelasi One-to-One dengan ThreatLog.
// Pemisahan ini mempermudah audit investigasi insiden siber secara spesifik tanpa memperlambat pembacaan log trafik utama.
func SaveAIInsight(logID uuid.UUID, modelName, analysis, recommendation string) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}

	insight := models.AIInsight{
		ThreatLogID:       logID,
		AIModel:           modelName,
		AnalysisText:      analysis,
		RecommendedAction: recommendation,
	}

	return DB.Create(&insight).Error
}

// SaveAntibodyAudit menyimpan rekam jejak permanen setiap kali NEX-AI Cognitive Core
// melakukan vaksinasi otonom terhadap payload zero-day baru ke Reflex Layer.
//
// Alasan Arsitektural (Why - Self-Healing Audit Trail):
// Event vaksinasi sebelumnya hanya tercatat di log lokal yang menghilang saat proses restart.
// Dengan menyimpan ke PostgreSQL, operator SOC memiliki visibilitas penuh atas:
// - Riwayat zero-day yang pernah menyerang dan berhasil dipelajari sistem.
// - Kapan sistem pertama kali mengenal pola serangan tertentu.
// - IP mana yang menjadi vektor "penemuan" antibodi baru.
// - Tingkat keyakinan model AI saat melakukan vaksinasi.
// Ini memenuhi klausul ISO 27001 A.12.4 untuk retensi log keamanan yang dapat diaudit.
func SaveAntibodyAudit(sourceIP, payload, threatType, instanceID string, confidence float64) error {
	// Potong payload menjadi fingerprint 500 karakter untuk efisiensi storage.
	signature := payload
	if len(signature) > 500 {
		signature = signature[:500]
	}

	record := models.AntibodyAudit{
		PayloadSignature: signature,
		SourceIP:         sourceIP,
		ThreatType:       threatType,
		ConfidenceScore:  confidence,
		VaccinatedAt:     time.Now(),
		InstanceID:       instanceID,
		IsSharedToRedis:  true, // Diasumsikan berhasil karena AddAntibody selalu mencoba Redis
	}

	if DB == nil {
		// Degraded mode: log ke stdout saja, jangan panik
		log.Printf("[ANTIBODY-AUDIT-WARN] DB not available. Antibody not persisted: type=%s ip=%s", threatType, sourceIP)
		return fmt.Errorf("database not initialized")
	}

	return DB.Create(&record).Error
}

// GetAntibodyAudits mengambil daftar antibodi yang sudah dipelajari sistem untuk ditampilkan
// di SOC Dashboard. Mendukung pagination untuk efisiensi query pada skala produksi.
//
// Alasan Arsitektural (Why):
// Fungsi ini digunakan oleh endpoint /api/antibodies yang dikonsumsi oleh SOC Dashboard.
// Menggunakan ORDER BY vaccinated_at DESC agar antibodi terbaru (yang paling relevan secara operasional)
// muncul di urutan teratas tabel dashboard tanpa perlu sort ulang di sisi frontend.
func GetAntibodyAudits(limit, offset int) ([]models.AntibodyAudit, int64, error) {
	if DB == nil {
		return nil, 0, fmt.Errorf("database not initialized")
	}

	var records []models.AntibodyAudit
	var total int64

	DB.Model(&models.AntibodyAudit{}).Count(&total)

	result := DB.Order("vaccinated_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&records)

	return records, total, result.Error
}
