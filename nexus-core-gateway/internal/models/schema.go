// Package models mendefinisikan skema tabel relational database (ORM) untuk Nexus Cyber SOC.
// Model ini dirancang khusus untuk mematuhi regulasi ISO 27001 (Kontrol Keamanan Informasi)
// dan UU PDP No. 27/2022 guna memastikan integritas data telemetri.
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Base bertindak sebagai fondasi untuk seluruh model database dengan menangani pengidentifikasi unik dan stempel waktu.
//
// Alasan Arsitektural (Why):
// Menggunakan UUID v4 secara default (`gen_random_uuid()`) alih-alih ID Integer berurutan.
// Hal ini mencegah serangan ID Enumeration (peretas memetakan total log kita dengan menebak angka berurutan)
// serta menjamin tidak ada konflik ID saat melakukan merger database multi-node secara terdistribusi.
type Base struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time      `gorm:"autoCreateTime"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"index"` // Menggunakan Soft Delete untuk mematuhi retensi data investigasi forensik
}

// BeforeCreate dipanggil oleh GORM secara otomatis sebelum menyimpan record baru.
// Menghasilkan UUID v4 secara programmatik untuk kompatibilitas lintas database (PostgreSQL & SQLite).
func (b *Base) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return
}

// ThreatLog memetakan struktur tabel `threat_logs` untuk menyimpan rekam jejak ancaman (Forensic Audit).
//
// Alasan Teknis (Why):
// Kolom SourceIP, Status, dan ThreatType di-indeks secara eksplisit (`index`) untuk mempercepat query
// hingga sub-milidetik ketika dashboard NCC memproses visualisasi peta ancaman 3D real-time berarus tinggi.
type ThreatLog struct {
	Base
	SourceIP      string `gorm:"type:varchar(45);index"` // Mendukung IPv4 dan IPv6 (maksimal 45 karakter)
	Endpoint      string `gorm:"type:varchar(255)"`
	Method        string `gorm:"type:varchar(10)"`
	Status        string `gorm:"type:varchar(50);index"`
	ThreatType    string `gorm:"type:varchar(100);index"`
	Severity      int    `gorm:"type:int"`
	PayloadSample string `gorm:"type:text"`
	UserAgent     string `gorm:"type:text"`
	LatencyMs     int    `gorm:"type:int"` // Latensi pemrosesan internal gateway
	PrevHash      string `gorm:"type:varchar(64);index"` // Hash entri log sebelumnya
	Hash          string `gorm:"type:varchar(64);index"` // Hash SHA-256 entri log ini
}

// MTDAuditTrail memetakan tabel `mtd_audit_trail` untuk merekam rotasi konfigurasi pertahanan dinamis (MTD).
// Memastikan setiap perubahan port backend terdokumentasi lengkap untuk audit regulator (BSSN/OJK).
type MTDAuditTrail struct {
	Base
	OldPort       int    `gorm:"type:int"`
	NewPort       int    `gorm:"type:int"`
	TriggerReason string `gorm:"type:varchar(100)"` // SCHEDULED_ROTATION atau EMERGENCY_MANUAL_SHUFFLE
	Status        string `gorm:"type:varchar(50)"`
}

// IntelBlacklist memetakan tabel `intel_blacklist` untuk memblokir IP penyerang secara persisten.
type IntelBlacklist struct {
	Base
	IPAddress string     `gorm:"type:varchar(45);uniqueIndex"`
	Reason    string     `gorm:"type:varchar(255)"`
	ExpiresAt *time.Time `gorm:"type:timestamp"` // Nullable: Jika NULL, maka pemblokiran bersifat permanen (Permanent Ban)
	IsActive  bool       `gorm:"type:boolean;default:true"`
	Country   string     `gorm:"type:varchar(100)"`
	City      string     `gorm:"type:varchar(100)"`
	ISP       string     `gorm:"type:varchar(150)"`
	Latitude  float64    `gorm:"type:decimal(9,6)"`
	Longitude float64    `gorm:"type:decimal(9,6)"`
}

// AIInsight menyimpan analisis kecerdasan buatan mendalam yang di-eskalasi dari Reflex Layer.
//
// Alasan Arsitektural (Why):
// Memiliki relasi One-to-One dengan ThreatLogID melalui constraint kunci asing (foreign key) CASCADE.
// Jika log dihapus, data analisis AI yang berelasi akan disesuaikan secara otomatis untuk integritas relasional.
type AIInsight struct {
	Base
	ThreatLogID       uuid.UUID `gorm:"type:uuid;index"`
	ThreatLog         ThreatLog `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	AIModel           string    `gorm:"type:varchar(100)"` // Qwen/Qwen3-235B atau NEX-AI Reasoning
	AnalysisText      string    `gorm:"type:text"`         // Ulasan intensi peretas dan analisa APT
	RecommendedAction string    `gorm:"type:varchar(255)"` // Mitigasi spesifik (misal: "BLOCK_IP")
}

// DomainSubscription memetakan tabel `domain_subscriptions` untuk kontrol lisensi SaaS WAF terpusat
// serta pendaftaran notifikasi Telegram Multi-Tenant per-domain.
type DomainSubscription struct {
	Base
	Domain          string     `gorm:"type:varchar(255);uniqueIndex"`
	OriginIP        string     `gorm:"type:varchar(255)"`
	IsActive        bool       `gorm:"type:boolean;default:true"`
	PlanType        string     `gorm:"type:varchar(50);default:'premium'"`
	TelegramChatID  string     `gorm:"type:varchar(100)"` // Chat ID / Channel ID Telegram milik pemilik domain
	TelegramEnabled bool       `gorm:"type:boolean;default:true"` // Status aktif/non-aktifkan notifikasi Telegram per domain
	LastAlertSentAt *time.Time `gorm:"type:timestamp"`    // Timestamp tracking untuk debounce/cooldown filter 15 menit
}

// AntibodyAudit memetakan tabel `antibody_audits` sebagai audit trail terstruktur untuk setiap antibodi
// zero-day yang dipelajari secara otonom oleh NEX-AI Cognitive Core (nex-ai-protect).
//
// Alasan Arsitektural (Why):
// Setiap kali NEX-AI mendeteksi serangan zero-day dan melakukan auto-vaccination via AddAntibody(),
// rekam jejak permanen disimpan di tabel ini agar operator SOC dapat:
// 1. Menelusuri riwayat lengkap serangan zero-day yang pernah dipelajari sistem.
// 2. Mengaudit kapan sistem "menjadi lebih cerdas" (timestamp vaksinasi).
// 3. Mengidentifikasi pola serangan berulang dari botnet yang berbeda.
// 4. Memenuhi kewajiban ISO 27001 A.12.4 (Logging dan Monitoring) untuk laporan kepatuhan BSSN/OJK.
type AntibodyAudit struct {
	Base
	// PayloadSignature adalah cuplikan (fingerprint) payload serangan yang divaksinasikan.
	// Dipotong maks 500 karakter untuk efisiensi storage (payload penuh terlalu besar untuk DB).
	PayloadSignature string `gorm:"type:varchar(500);index"`
	// SourceIP adalah IP penyerang yang pertama kali menggunakan teknik zero-day ini.
	SourceIP         string `gorm:"type:varchar(45);index"`
	// ThreatType adalah klasifikasi jenis serangan dari Cognitive Core (mis: ZERO_DAY_BYPASS, ADVANCED_PERSISTENT).
	ThreatType       string `gorm:"type:varchar(100)"`
	// ConfidenceScore adalah tingkat keyakinan model nex-ai-protect saat mendeteksi ancaman (0.0 - 1.0).
	ConfidenceScore  float64 `gorm:"type:decimal(4,3)"`
	// VaccinatedAt adalah timestamp eksak saat antibodi didaftarkan ke Reflex Layer.
	VaccinatedAt     time.Time `gorm:"type:timestamp;index"`
	// InstanceID mengidentifikasi instansi gateway mana yang pertama kali mendeteksi dan memvaksinasi.
	// Penting untuk multi-VPS deployment debugging.
	InstanceID       string `gorm:"type:varchar(100)"`
	// IsSharedToRedis menandai apakah antibodi ini sudah berhasil disinkronkan ke Redis shared store.
	IsSharedToRedis  bool   `gorm:"type:boolean;default:false"`
}


