package proxy

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// LabVaccineAntibody is a constant lab token. It is not an exploit payload and
// is never returned by the public signal endpoint.
const LabVaccineAntibody = "nexred-lab-vaccine"

// AntibodyCount returns unique virtual-patch keys in memory (not payload text).
func (np *NexusProxy) AntibodyCount() int {
	if np == nil {
		return 0
	}
	n := 0
	np.Patches.Range(func(_, _ interface{}) bool {
		n++
		return true
	})
	return n
}

func (np *NexusProxy) writeAntibodyCountHeader(w http.ResponseWriter) {
	w.Header().Set("X-Nexus-Waf", "1")
	w.Header().Set("X-Nexus-Antibody-Count", strconv.Itoa(np.AntibodyCount()))
}

// AntibodySignalHandler is the lab-safe public GET. Count only — never patch strings.
func AntibodySignalHandler(np *NexusProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_, _ = w.Write([]byte(`{"status":"error","message":"method not allowed"}`))
			return
		}
		count := 0
		if np != nil {
			count = np.AntibodyCount()
			np.writeAntibodyCountHeader(w)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":         "ok",
			"antibody_count": count,
			"signal":         "count_only",
			"lists_patterns": false,
		})
	}
}

// LabVaccineProbeHandler registers a constant lab antibody and returns 403.
// NEX-RED uses this to prove vaccination without sending exploit payloads.
func LabVaccineProbeHandler(np *NexusProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", "POST")
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusMethodNotAllowed)
			_, _ = w.Write([]byte(`{"status":"error","message":"method not allowed"}`))
			return
		}
		if np != nil {
			np.AddAntibody(LabVaccineAntibody)
			np.writeAntibodyCountHeader(w)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"status":"blocked","lab":"vaccine-probe"}`))
	}
}
