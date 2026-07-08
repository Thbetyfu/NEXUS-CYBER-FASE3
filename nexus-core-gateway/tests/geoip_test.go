package tests

import (
	"testing"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
)

// TestIPGeoInfoLookups memverifikasi keakuratan pendeteksian data geografis (GeoIP)
// menggunakan fungsi publik database.GetIPGeoInfo.
func TestIPGeoInfoLookups(t *testing.T) {
	tests := []struct {
		ip              string
		expectedCountry string
	}{
		{"8.8.8.8", "United States"},
		{"165.21.83.88", "Singapore"},
		{"210.140.10.10", "Japan"},
		{"212.58.244.71", "United Kingdom"},
	}

	t.Log("Memulai uji pencarian koordinat geografis internasional...")

	for _, tc := range tests {
		country, city, isp, lat, lon := database.GetIPGeoInfo(tc.ip)
		t.Logf("[GEO-TEST-RESULT] IP: %-15s => Negara: %-15s | Kota: %-10s | ISP: %-18s | Lat: %-8.4f | Lon: %-8.4f", 
			tc.ip, country, city, isp, lat, lon)

		if country == "Unknown" {
			t.Errorf("[FAIL] Pendeteksian gagal (Unknown) untuk IP: %s", tc.ip)
			continue
		}

		if country != tc.expectedCountry {
			t.Errorf("[FAIL] IP %s terdeteksi di %s, diharapkan %s", tc.ip, country, tc.expectedCountry)
		}
	}
}
