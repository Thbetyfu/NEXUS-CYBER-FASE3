package database

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
)

const maxDigestRows = 2000
const maxDigestSample = 20

// IncidentCount is a grouped tally for digest tables.
type IncidentCount struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

// IncidentSample is a redacted row (no request body / password).
type IncidentSample struct {
	CreatedAt    time.Time `json:"created_at"`
	SourceIP     string    `json:"source_ip"`
	Endpoint     string    `json:"endpoint"`
	Method       string    `json:"method"`
	Status       string    `json:"status"`
	ThreatType   string    `json:"threat_type"`
	TargetDomain string    `json:"target_domain"`
}

// IncidentDigest is the operator export for a protected host (not a client SOC).
type IncidentDigest struct {
	Domain       string           `json:"domain"`
	Since        time.Time        `json:"since"`
	Until        time.Time        `json:"until"`
	Hours        int              `json:"hours"`
	Total        int              `json:"total"`
	ByStatus     []IncidentCount  `json:"by_status"`
	TopIPs       []IncidentCount  `json:"top_ips"`
	TopEndpoints []IncidentCount  `json:"top_endpoints"`
	TopThreats   []IncidentCount  `json:"top_threats"`
	Samples      []IncidentSample `json:"samples"`
	Note         string           `json:"note"`
}

// QueryIncidentDigest reads ThreatLog for one host. Empty domain is invalid.
func QueryIncidentDigest(domain string, since, until time.Time, hours int) (*IncidentDigest, error) {
	if DB == nil {
		return nil, fmt.Errorf("database unavailable")
	}
	domain = strings.ToLower(strings.TrimSpace(domain))
	if domain == "" || domain == "all" {
		return nil, fmt.Errorf("domain required (pick a workspace, not Global Overwatch)")
	}

	var total int64
	countQ := DB.Model(&models.ThreatLog{}).Where("created_at >= ? AND created_at <= ? AND target_domain = ?", since, until, domain)
	if err := countQ.Count(&total).Error; err != nil {
		return nil, err
	}

	var rows []models.ThreatLog
	q := DB.Where("created_at >= ? AND created_at <= ? AND target_domain = ?", since, until, domain)
	if err := q.Order("created_at desc").Limit(maxDigestRows).Find(&rows).Error; err != nil {
		return nil, err
	}

	d := &IncidentDigest{
		Domain: domain,
		Since:  since.UTC(),
		Until:  until.UTC(),
		Hours:  hours,
		Total:  int(total),
		Samples:  []IncidentSample{},
		Note:     "Digest dari threat_logs (WAF + integrity restore yang tercatat). Bukan pentest Shannon. Bukan dashboard pelanggan. Baris lama tanpa target_domain tidak masuk.",
	}
	if total > maxDigestRows {
		d.Note += fmt.Sprintf(" Agregasi tabel dari %d baris terbaru (dari %d).", maxDigestRows, total)
	}
	statusN := map[string]int{}
	ipN := map[string]int{}
	epN := map[string]int{}
	thN := map[string]int{}
	for _, row := range rows {
		st := row.Status
		if st == "" {
			st = "(empty)"
		}
		statusN[st]++
		ipN[row.SourceIP]++
		ep := row.Endpoint
		if ep == "" {
			ep = "/"
		}
		epN[ep]++
		tt := row.ThreatType
		if tt == "" {
			tt = "(none)"
		}
		thN[tt]++
	}
	d.ByStatus = topCounts(statusN, 12)
	d.TopIPs = topCounts(ipN, 10)
	d.TopEndpoints = topCounts(epN, 10)
	d.TopThreats = topCounts(thN, 10)
	for i, row := range rows {
		if i >= maxDigestSample {
			break
		}
		d.Samples = append(d.Samples, IncidentSample{
			CreatedAt:    row.CreatedAt.UTC(),
			SourceIP:     row.SourceIP,
			Endpoint:     row.Endpoint,
			Method:       row.Method,
			Status:       row.Status,
			ThreatType:   row.ThreatType,
			TargetDomain: row.TargetDomain,
		})
	}
	return d, nil
}

func topCounts(m map[string]int, n int) []IncidentCount {
	out := make([]IncidentCount, 0, len(m))
	for k, v := range m {
		out = append(out, IncidentCount{Key: k, Count: v})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Key < out[j].Key
	})
	if len(out) > n {
		out = out[:n]
	}
	return out
}

// FormatIncidentDigestMD is the operator hand-off for the kanal owner.
func FormatIncidentDigestMD(d *IncidentDigest) string {
	if d == nil {
		return ""
	}
	var b strings.Builder
	fmt.Fprintf(&b, "# Digest insiden Nexus — `%s`\n\n", d.Domain)
	fmt.Fprintf(&b, "- Jendela: %s → %s (UTC, %d jam)\n", d.Since.Format(time.RFC3339), d.Until.Format(time.RFC3339), d.Hours)
	fmt.Fprintf(&b, "- Baris tercatat (maks %d): **%d**\n", maxDigestRows, d.Total)
	fmt.Fprintf(&b, "- %s\n\n", d.Note)
	fmt.Fprintf(&b, "## Status\n\n")
	writeCountTable(&b, d.ByStatus)
	fmt.Fprintf(&b, "## IP teratas\n\n")
	writeCountTable(&b, d.TopIPs)
	fmt.Fprintf(&b, "## Endpoint\n\n")
	writeCountTable(&b, d.TopEndpoints)
	fmt.Fprintf(&b, "## Jenis ancaman\n\n")
	writeCountTable(&b, d.TopThreats)
	fmt.Fprintf(&b, "## Cuplikan (tanpa badan request)\n\n")
	if len(d.Samples) == 0 {
		fmt.Fprintf(&b, "_Tidak ada baris._\n")
		return b.String()
	}
	fmt.Fprintf(&b, "| Waktu UTC | IP | Status | Tipe | Method | Endpoint |\n| --- | --- | --- | --- | --- | --- |\n")
	for _, s := range d.Samples {
		fmt.Fprintf(&b, "| %s | `%s` | %s | %s | %s | `%s` |\n",
			s.CreatedAt.Format("2006-01-02 15:04:05"),
			s.SourceIP, s.Status, s.ThreatType, s.Method, s.Endpoint)
	}
	return b.String()
}

func writeCountTable(b *strings.Builder, rows []IncidentCount) {
	if len(rows) == 0 {
		fmt.Fprintf(b, "_Kosong._\n\n")
		return
	}
	fmt.Fprintf(b, "| Kunci | Jumlah |\n| --- | ---: |\n")
	for _, r := range rows {
		fmt.Fprintf(b, "| `%s` | %d |\n", r.Key, r.Count)
	}
	fmt.Fprintf(b, "\n")
}
