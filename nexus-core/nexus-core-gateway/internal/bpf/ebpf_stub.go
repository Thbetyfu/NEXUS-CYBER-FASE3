//go:build !linux

// Package bpf mengintegrasikan manajer tingkat rendah (kernel-level) menggunakan eBPF untuk mitigasi serangan siber.
package bpf

import (
	"log"
	"math/rand"
	"sync"
	"time"
)

var (
	instance *BpfManager
	once     sync.Once
)

// BpfManager mengimplementasikan jembatan kendali eBPF (Extended Berkeley Packet Filter) di tingkat kernel.
type BpfManager struct {
	mapName    string
	mu         sync.RWMutex
	blockedIPs map[string]bool
	
	// Simulated Stats
	droppedPackets uint64
	droppedBytes   uint64
	throughputMbps float64
}

// NewBpfManager mengonstruksi manajer eBPF stub.
func NewBpfManager() *BpfManager {
	once.Do(func() {
		instance = &BpfManager{
			mapName:    "nexus_malicious_ips",
			blockedIPs: make(map[string]bool),
		}
		// Jalankan background simulator untuk meningkatkan data statistik secara dinamis jika ada IP yang diblokir
		go instance.runSimulator()
	})
	return instance
}

func (b *BpfManager) runSimulator() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		b.mu.Lock()
		count := len(b.blockedIPs)
		if count > 0 {
			// Setiap IP terblokir mensimulasikan traffic DDoS konstan
			// Misal: 10,000 paket per detik per IP
			pps := uint64(10000 + rand.Intn(5000))
			packetsDropped := pps * uint64(count)
			
			// Rata-rata ukuran paket Ethernet (e.g., 512 bytes)
			bytesDropped := packetsDropped * uint64(256 + rand.Intn(512))

			b.droppedPackets += packetsDropped
			b.droppedBytes += bytesDropped
			
			// Hitung throughput dalam Mbps: (bytes * 8) / (1024 * 1024)
			b.throughputMbps = float64(bytesDropped*8) / (1024.0 * 1024.0)
		} else {
			b.throughputMbps = 0.0
		}
		b.mu.Unlock()
	}
}

// BlockIP mendaftarkan IP penyerang ke dalam tabel pemblokiran eBPF.
func (b *BpfManager) BlockIP(ip string) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	
	b.blockedIPs[ip] = true
	log.Printf("[eBPF-KERNEL] (STUB) IP %s injected into eBPF map '%s'. Action: XDP_DROP", ip, b.mapName)
	return nil
}

// UnblockIP menghapus IP dari tabel pemblokiran eBPF untuk memulihkan hak akses trafik normal.
func (b *BpfManager) UnblockIP(ip string) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	
	delete(b.blockedIPs, ip)
	log.Printf("[eBPF-KERNEL] (STUB) IP %s removed from eBPF map '%s'. Action: XDP_PASS", ip, b.mapName)
	return nil
}

// GetStats mengembalikan data statistik pemblokiran eBPF
func (b *BpfManager) GetStats() (bool, uint64, uint64, float64, int, []string) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	var ipList []string
	for ip := range b.blockedIPs {
		ipList = append(ipList, ip)
	}

	return true, b.droppedPackets, b.droppedBytes, b.throughputMbps, len(b.blockedIPs), ipList
}

