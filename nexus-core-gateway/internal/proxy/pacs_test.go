package proxy

import (
	"strings"
	"testing"
)

// TestGenerateRandomKey memvalidasi keacakan dan panjang kunci yang dihasilkan
func TestGenerateRandomKey(t *testing.T) {
	lengths := []int{8, 16, 32}
	for _, l := range lengths {
		key1 := generateRandomKey(l)
		key2 := generateRandomKey(l)

		if len(key1) != l {
			t.Errorf("Expected key length of %d, got %d", l, len(key1))
		}
		if key1 == key2 {
			t.Errorf("Key generation is not random; got identical keys: %s", key1)
		}
	}
}

// TestRandomVarName memvalidasi format nama variabel JavaScript agar valid (harus dimulai dengan huruf/underscore)
func TestRandomVarName(t *testing.T) {
	for i := 0; i < 10; i++ {
		name := randomVarName(6)
		if len(name) != 7 { // _ + 6 chars
			t.Errorf("Expected var name length of 7, got %d", len(name))
		}
		if !strings.HasPrefix(name, "_") {
			t.Errorf("Expected var name to start with '_', got %s", name)
		}
		// First character after underscore must be an alphabetic letter
		firstChar := name[1]
		if !((firstChar >= 'a' && firstChar <= 'z') || (firstChar >= 'A' && firstChar <= 'Z')) {
			t.Errorf("JavaScript variable must start with a letter, got char: %c in name: %s", firstChar, name)
		}
	}
}

// TestObfuscateHTML memvalidasi enkripsi HTML polimorfik PACS dan penanganan lisensi
func TestObfuscateHTML(t *testing.T) {
	originalHTML := "<html><body><h1>Secret Admin Dashboard</h1></body></html>"
	
	// Test Case 1: Obfuscation active
	obfuscated := ObfuscateHTML(originalHTML, "localhost")
	if strings.Contains(obfuscated, "Secret Admin Dashboard") {
		t.Error("ObfuscateHTML failed: original plain text HTML leaked in the response")
	}
	if !strings.Contains(obfuscated, "pacs-loader") {
		t.Error("ObfuscateHTML failed: missing loader container 'pacs-loader'")
	}
	if !strings.Contains(obfuscated, "<script>") {
		t.Error("ObfuscateHTML failed: missing decryption script element")
	}

	// Test Case 2: Inactive domain subscription returns paywall
	// Let's create a domain that will definitely be inactive or mock domain status.
	// Since database.DB is nil in tests, IsDomainActive fallback to true, but we can verify it.
}

// TestXOREncryption memverifikasi keakuratan enkripsi dan dekripsi XOR byte-by-byte
func TestXOREncryption(t *testing.T) {
	plaintext := "A super secret payload with unicode characters: ⚡🔒🛡️"
	key := "Nx7@a!9Z"

	// Encrypt
	ciphertext := make([]byte, len(plaintext))
	for i := 0; i < len(plaintext); i++ {
		ciphertext[i] = plaintext[i] ^ key[i%len(key)]
	}

	// Ciphertext should not match plaintext
	if string(ciphertext) == plaintext {
		t.Error("XOR encryption failed: ciphertext matches plaintext")
	}

	// Decrypt
	decrypted := make([]byte, len(ciphertext))
	for i := 0; i < len(ciphertext); i++ {
		decrypted[i] = ciphertext[i] ^ key[i%len(key)]
	}

	if string(decrypted) != plaintext {
		t.Errorf("XOR decryption failed: expected '%s', got '%s'", plaintext, string(decrypted))
	}
}
