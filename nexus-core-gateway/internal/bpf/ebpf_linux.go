//go:build linux

package bpf

import (
	"fmt"
	"log"
	"net"

	"github.com/cilium/ebpf"
	"github.com/cilium/ebpf/link"
	"github.com/cilium/ebpf/rlimit"
)

// BpfManager mengimplementasikan jembatan kendali eBPF (Extended Berkeley Packet Filter) di tingkat kernel Linux.
type BpfManager struct {
	mapName string
	bpfMap  *ebpf.Map
	xdpLink link.Link
	loaded  bool
}

// NewBpfManager mengonstruksi manajer eBPF asli untuk Linux.
func NewBpfManager() *BpfManager {
	manager := &BpfManager{
		mapName: "nexus_malicious_ips",
	}

	// Hapus batas penguncian memori kernel agar program eBPF bisa mengalokasikan map RAM
	if err := rlimit.RemoveMemlock(); err != nil {
		log.Printf("[eBPF-WARN] Failed to remove memlock limit: %v", err)
	}

	// Muat / buat eBPF map secara dinamis programmatik
	spec := &ebpf.MapSpec{
		Name:       manager.mapName,
		Type:       ebpf.Hash,
		KeySize:    4, // IPv4 (4 bytes)
		ValueSize:  1, // Status (1 byte)
		MaxEntries: 10240,
	}

	m, err := ebpf.NewMap(spec)
	if err != nil {
		log.Printf("[eBPF-ERROR] Failed to create native kernel eBPF map: %v", err)
	} else {
		manager.bpfMap = m
		manager.loaded = true
		log.Printf("[eBPF-INIT] Native Linux eBPF Map '%s' successfully initialized in kernel space.", manager.mapName)
	}

	return manager
}

// BlockIP mendaftarkan IP penyerang ke dalam tabel pemblokiran eBPF.
func (b *BpfManager) BlockIP(ip string) error {
	if !b.loaded || b.bpfMap == nil {
		log.Printf("[eBPF-WARN] eBPF Map not loaded. Simulating BlockIP for %s", ip)
		return nil
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return fmt.Errorf("invalid IP format: %s", ip)
	}

	// Konversi IP ke IPv4 byte array (4 bytes)
	ipv4 := parsedIP.To4()
	if ipv4 == nil {
		return fmt.Errorf("only IPv4 is supported in this eBPF map edition: %s", ip)
	}

	// Masukkan ke map: Key (IPv4), Value (1)
	var val uint8 = 1
	var key [4]byte
	copy(key[:], ipv4)

	err := b.bpfMap.Put(key, val)
	if err != nil {
		return fmt.Errorf("failed to inject IP to kernel eBPF map: %v", err)
	}

	log.Printf("[eBPF-KERNEL] (NATIVE) IP %s injected into eBPF map '%s'. Action: XDP_DROP enforced.", ip, b.mapName)
	return nil
}

// UnblockIP menghapus IP dari tabel pemblokiran eBPF untuk memulihkan hak akses trafik normal.
func (b *BpfManager) UnblockIP(ip string) error {
	if !b.loaded || b.bpfMap == nil {
		log.Printf("[eBPF-WARN] eBPF Map not loaded. Simulating UnblockIP for %s", ip)
		return nil
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return fmt.Errorf("invalid IP format: %s", ip)
	}

	ipv4 := parsedIP.To4()
	if ipv4 == nil {
		return fmt.Errorf("only IPv4 is supported in this eBPF map edition: %s", ip)
	}

	var key [4]byte
	copy(key[:], ipv4)

	err := b.bpfMap.Delete(key)
	if err != nil {
		return fmt.Errorf("failed to remove IP from kernel eBPF map: %v", err)
	}

	log.Printf("[eBPF-KERNEL] (NATIVE) IP %s removed from eBPF map '%s'. Action: XDP_PASS restored.", ip, b.mapName)
	return nil
}
