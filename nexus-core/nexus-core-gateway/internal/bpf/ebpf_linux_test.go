//go:build linux

package bpf

import "testing"

func TestBpfManager_BlockIPDegradesWithoutKernelMap(t *testing.T) {
	manager := NewBpfManager()
	if manager == nil {
		t.Fatal("expected BpfManager")
	}
	if err := manager.BlockIP("192.168.1.1"); err != nil {
		t.Fatalf("BlockIP should not fail when the kernel map is unavailable: %v", err)
	}
	if err := manager.UnblockIP("192.168.1.1"); err != nil {
		t.Fatalf("UnblockIP should not fail when the kernel map is unavailable: %v", err)
	}
}
