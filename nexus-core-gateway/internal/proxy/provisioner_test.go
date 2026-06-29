package proxy

import "testing"

func TestFindFreePort(t *testing.T) {
	port, err := FindFreePort(4001)
	if err != nil {
		t.Fatalf("Expected to find a free port, got error: %v", err)
	}
	if port < 4001 {
		t.Errorf("Expected port >= 4001, got %d", port)
	}
}

func TestRunProvisionerInvalidAction(t *testing.T) {
	// Memanggil dengan action kosong harus mengembalikan error karena kegagalan parameter
	err := RunProvisioner("", "invalid-domain", 0)
	if err == nil {
		t.Error("Expected error when running provisioner with empty action, got nil")
	}
}
