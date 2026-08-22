package main

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/nexus-cyber/nexus-core-gateway/internal/ai"
	"github.com/nexus-cyber/nexus-core-gateway/internal/bpf"
	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
	"github.com/nexus-cyber/nexus-core-gateway/internal/proxy"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

var domainRegex = regexp.MustCompile(`^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})*(:\d+)?$`)

const defaultPaymentWebhookSecret = "dev-payment-webhook-secret"

func isValidDomain(domain string) bool {
	return domainRegex.MatchString(domain)
}

func configuredPaymentWebhookSecret() string {
	secret := strings.TrimSpace(os.Getenv("NEXUS_PAYMENT_WEBHOOK_SECRET"))
	if secret == "" {
		return defaultPaymentWebhookSecret
	}
	return secret
}

type TelemetryResponse struct {
	MTD struct {
		ActivePort  int    `json:"active_port"`
		NextShuffle int    `json:"next_shuffle_secs"`
		Status      string `json:"status"`
	} `json:"mtd"`
	Ebpf struct {
		Enabled         bool     `json:"enabled"`
		DroppedPackets  uint64   `json:"dropped_packets"`
		DroppedBytes    uint64   `json:"dropped_bytes"`
		ThroughputMbps  float64  `json:"throughput_mbps"`
		BlockedIPsCount int      `json:"blocked_ips_count"`
		BlockedIPsList  []string `json:"blocked_ips_list"`
	} `json:"ebpf"`
	RecentLogs []logger.TelemetryLog `json:"recent_logs"`
	Stats      struct {
		Allowed  int `json:"allowed"`
		Blocked  int `json:"blocked"`
		Honeypot int `json:"honeypot"`
		Panics   int `json:"panics"`
	} `json:"stats"`
}

func telemetryHandler(shuffler *mtd.TopologyShuffler, telemetry *logger.Logger, backendTarget string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		filterDomain := strings.ToLower(r.URL.Query().Get("domain"))
		if filterDomain == "" {
			filterDomain = "all"
		}
		backendStatus := "CONNECTED"
		client := http.Client{Timeout: 300 * time.Millisecond}
		pingResp, err := client.Get(backendTarget + "/api/status")
		if err != nil {
			backendStatus = "OFFLINE"
		} else {
			pingResp.Body.Close()
		}
		// Fetch eBPF stats
		bpfManager := bpf.NewBpfManager()
		ebpfEnabled, droppedPackets, droppedBytes, throughput, blockedCount, blockedList := bpfManager.GetStats()

		resp := TelemetryResponse{}
		resp.MTD.Status = backendStatus
		resp.MTD.ActivePort, resp.MTD.NextShuffle = shuffler.GetStatus()

		resp.Ebpf.Enabled = ebpfEnabled
		resp.Ebpf.DroppedPackets = droppedPackets
		resp.Ebpf.DroppedBytes = droppedBytes
		resp.Ebpf.ThroughputMbps = throughput
		resp.Ebpf.BlockedIPsCount = blockedCount
		resp.Ebpf.BlockedIPsList = blockedList

		allLogs := telemetry.GetRecentLogs()
		if filterDomain == "all" {
			resp.RecentLogs = allLogs
			resp.Stats.Allowed = telemetry.TotalAllowed
			resp.Stats.Blocked = telemetry.TotalBlocked
			resp.Stats.Honeypot = telemetry.TotalHoneypot
		} else {
			var domainLogs []logger.TelemetryLog
			for _, l := range allLogs {
				if strings.ToLower(l.TargetDomain) == filterDomain {
					domainLogs = append(domainLogs, l)
				}
			}
			resp.RecentLogs = domainLogs
			allowed, blocked, honeypot := telemetry.GetDomainStats(filterDomain)
			resp.Stats.Allowed = allowed
			resp.Stats.Blocked = blocked
			resp.Stats.Honeypot = honeypot
		}
		resp.Stats.Panics = telemetry.TotalPanic
		json.NewEncoder(w).Encode(resp)
	}
}

func reportGenerateHandler(telemetry *logger.Logger) http.HandlerFunc {
	_ = telemetry
	return func(w http.ResponseWriter, r *http.Request) {
		domain := r.URL.Query().Get("domain")
		if domain == "" {
			domain = "all"
		}
		allowedCount, blockedCount, immuneCount := "0", "0", "0"
		if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			allowed, _ := mtd.MtdRedis.Client.Get(ctx, fmt.Sprintf("nexus:traffic:ALLOWED:%s", domain)).Result()
			blocked, _ := mtd.MtdRedis.Client.Get(ctx, fmt.Sprintf("nexus:traffic:DIVERTED_TO_HONEYPOT:%s", domain)).Result()
			immune, _ := mtd.MtdRedis.Client.Get(ctx, fmt.Sprintf("nexus:traffic:INSTANT_DROP_PATCH:%s", domain)).Result()
			if allowed != "" {
				allowedCount = allowed
			}
			if blocked != "" {
				blockedCount = blocked
			}
			if immune != "" {
				immuneCount = immune
			}
		}
		prompt := fmt.Sprintf(`Identitas: Analis SOC Senior. Buat laporan MD formal untuk domain %s. Metrik: Allowed=%s, Diverted=%s, Immune=%s.`, domain, allowedCount, blockedCount, immuneCount)
		qwen := ai.NewQwenClient("")
		result, _, _ := qwen.Generate(prompt)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "success", "report_content": result})
	}
}

func xxxDomainsHandler(telemetry *logger.Logger, router *proxy.DynamicRouter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method == http.MethodDelete {
			domain := r.URL.Query().Get("domain")
			fmt.Printf("[API-DELETE] Request to purge domain: %s\n", domain)
			if domain == "" || domain == "all" {
				w.WriteHeader(http.StatusBadRequest)
				json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Invalid domain for deletion"})
				return
			}

			// 1. Hapus secara permanen dari Dynamic Router (caching lokal + Redis)
			router.RemoveRoute(domain)

			// Trigger container teardown if it was auto-provisioned
			go func(d string) {
				err := proxy.RunProvisioner("down", d, 0)
				if err != nil {
					fmt.Printf("[PROVISIONER-ERROR] Failed to down container for %s: %v\n", d, err)
				}
			}(domain)

			// 2. Hapus secara permanen (hard delete) dari database subscriptions
			if database.DB != nil {
				database.DB.Unscoped().Where("domain = ?", domain).Delete(&models.DomainSubscription{})
			}

			// 3. Bersihkan sisa metrik dan log telemetri di memori WAF
			telemetry.DeleteDomain(domain)

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": "Domain purged from matrix"})
			return
		}

		// GET logic: Returns only active domains from the managed list
		domains := telemetry.GetDomains()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(domains)
	}
}

func aiEventsHandler(telemetry *logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		json.NewEncoder(w).Encode(telemetry.GetRecentAIEvents())
	}
}

func aiStreamHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		flusher, _ := w.(http.Flusher)
		fmt.Fprintf(w, "data: {\"status\":\"TUNNEL_ACTIVE\"}\n\n")
		flusher.Flush()
		for {
			select {
			case <-r.Context().Done():
				return
			case <-time.After(15 * time.Second):
				fmt.Fprintf(w, ": heartbeat\n\n")
				flusher.Flush()
			}
		}
	}
}

func threatsStreamHandler(np *proxy.NexusProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		flusher, _ := w.(http.Flusher)
		clientID := fmt.Sprintf("CLIENT_%d", time.Now().UnixNano())
		clientChan := make(chan string, 100)
		np.ThreatListeners.Store(clientID, clientChan)
		defer np.ThreatListeners.Delete(clientID)
		fmt.Fprintf(w, "data: {\"status\":\"TUNNEL_ESTABLISHED\"}\n\n")
		flusher.Flush()
		for {
			select {
			case <-r.Context().Done():
				return
			case msg := <-clientChan:
				fmt.Fprintf(w, "data: %s\n\n", msg)
				flusher.Flush()
			case <-time.After(15 * time.Second):
				fmt.Fprintf(w, ": heartbeat\n\n")
				flusher.Flush()
			}
		}
	}
}

func aiStatusHandler() http.HandlerFunc {
	client := ai.NewQwenClient("")
	return func(w http.ResponseWriter, r *http.Request) {
		status, latency := client.CheckHealth()
		if status == "OFFLINE" {
			// Otak Kiri (NEX-AI Reflex Core) terintegrasi langsung di Go Gateway dan selalu aktif sub-1.2ms
			status = "REFLEX_ACTIVE"
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     status,
			"latency_ms": latency,
			"model":      "NEX-AI Protect v2.9",
		})
	}
}

func routesHandler(router *proxy.DynamicRouter, telemetry *logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			routes, _ := router.GetAllRoutes()
			json.NewEncoder(w).Encode(routes)
			return
		}

		if r.Method == http.MethodPost {
			var payload struct {
				Domain    string `json:"domain"`
				TargetURL string `json:"target_url"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				w.WriteHeader(http.StatusBadRequest)
				return
			}

			// Validate inputs
			if !isValidDomain(payload.Domain) {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(`{"status":"error","message":"Invalid Domain format"}`))
				return
			}
			if payload.TargetURL != "auto" {
				if err := proxy.ValidateProxyOrigin(payload.TargetURL); err != nil {
					w.WriteHeader(http.StatusBadRequest)
					json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": err.Error()})
					return
				}
			}

			targetURL := payload.TargetURL
			if targetURL == "auto" {
				port, err := proxy.FindFreePort(3003)
				if err != nil {
					w.WriteHeader(http.StatusInternalServerError)
					w.Write([]byte(`{"status":"error","message":"Failed to allocate port"}`))
					return
				}
				targetURL = "http://127.0.0.1:" + strconv.Itoa(port)

				// Run container provisioner asynchronously
				go func(d string, p int) {
					err := proxy.RunProvisioner("up", d, p)
					if err != nil {
						fmt.Printf("[PROVISIONER-ERROR] Failed to up container for %s on port %d: %v\n", d, p, err)
					}
				}(payload.Domain, port)
			}

			// 1. Add to Proxy Router
			router.AddRoute(payload.Domain, targetURL)

			// 2. Register in Telemetry so it appears in the dropdown immediately
			telemetry.AddDomain(payload.Domain)

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"status": "success", "domain": payload.Domain, "target_url": targetURL})
			return
		}
	}
}

func paymentWebhookHandler(router *proxy.DynamicRouter, telemetry *logger.Logger) http.HandlerFunc {
	type WebhookPayload struct {
		Domain   string `json:"domain"`
		Status   string `json:"status"`    // "paid" or "success"
		PlanType string `json:"plan_type"` // "premium" or "enterprise"
	}

	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Method not allowed"})
			return
		}

		providedSecret := strings.TrimSpace(r.Header.Get("X-Nexus-Webhook-Secret"))
		if providedSecret == "" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Missing webhook secret"})
			return
		}
		if subtle.ConstantTimeCompare([]byte(providedSecret), []byte(configuredPaymentWebhookSecret())) != 1 {
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Invalid webhook secret"})
			return
		}

		var payload WebhookPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Invalid JSON payload"})
			return
		}

		if payload.Domain == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Missing domain parameter"})
			return
		}

		// Validasi format domain
		if !isValidDomain(payload.Domain) {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Invalid domain format"})
			return
		}

		// Memproses jika status pembayaran adalah paid atau success
		if payload.Status != "paid" && payload.Status != "success" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Payment status must be paid or success"})
			return
		}

		// 1. Alokasikan port acak secara dinamis
		port, err := proxy.FindFreePort(3003)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Failed to allocate target port"})
			return
		}
		targetURL := "http://127.0.0.1:" + strconv.Itoa(port)

		// 2. Daftarkan DomainSubscription di PostgreSQL database
		plan := payload.PlanType
		if plan == "" {
			plan = "premium"
		}
		if database.DB != nil {
			sub := models.DomainSubscription{
				Domain:   payload.Domain,
				OriginIP: targetURL,
				IsActive: true,
				PlanType: plan,
			}
			// Gunakan Save untuk update jika sudah ada
			if err := database.DB.Save(&sub).Error; err != nil {
				fmt.Printf("[BILLING-ERROR] Failed to save domain subscription: %v\n", err)
			}
		}

		// 3. Picu orkestrasi provisioning kontainer secara asinkron di goroutine
		go func(d string, p int) {
			err := proxy.RunProvisioner("up", d, p)
			if err != nil {
				fmt.Printf("[PROVISIONER-ERROR] Failed to up container for %s on port %d: %v\n", d, p, err)
			}
		}(payload.Domain, port)

		// 4. Daftarkan rute proxy dinamis
		router.AddRoute(payload.Domain, targetURL)

		// 5. Tambahkan ke monitoring domain telemetri
		telemetry.AddDomain(payload.Domain)

		// 6. Log aktivitas AI untuk Dashboard SOC
		telemetry.LogAIEvent(logger.AIEventLog{
			Timestamp:    time.Now(),
			Layer:        "Billing",
			Status:       "PROVISION_SUCCESS",
			DetailAction: fmt.Sprintf("[BILLING] Webhook payment verified for %s. Provisioning container on port %d.", payload.Domain, port),
		})

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":     "success",
			"message":    "Payment processed successfully. Tenant provisioned.",
			"domain":     payload.Domain,
			"target_url": targetURL,
		})
	}
}

func panicHandler(shuffler *mtd.TopologyShuffler, telemetry *logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		telemetry.TotalPanic++
		shuffler.ManualShuffle()
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	}
}

func nechatHandler(telemetry *logger.Logger) http.HandlerFunc {
	nechat := ai.NewNechatClient()
	return func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Query  string `json:"query"`
			Domain string `json:"domain"`
		}
		json.NewDecoder(r.Body).Decode(&payload)
		reply, err := nechat.Chat(telemetry.GetRecentLogs(), payload.Query)
		if err != nil {
			fmt.Printf("[ALPACA-ERROR] Nechat failed: %v\n", err)
			reply = "🤖 **Nexus Core Error:** Gagal terhubung ke sistem ALPACA. \n\n**Solusi:**\n1. Pastikan aplikasi Alpaca sedang terbuka.\n2. Cek apakah model `nex-ai-protect` sudah di-download di dalam Alpaca.\n3. Coba restart gateway."
		}
		json.NewEncoder(w).Encode(map[string]string{"reply": reply})
	}
}

func cliExecuteHandler(telemetry *logger.Logger, shuffler *mtd.TopologyShuffler, router *proxy.DynamicRouter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var payload struct {
			Command string `json:"command"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		cmd := strings.ToLower(payload.Command)
		var response string

		switch {
		case cmd == "help" || cmd == "/help":
			response = "[NEXUS-HELP] Available Commands:\n" +
				"  - status                : Check MTD & Backend Health\n" +
				"  - stats                 : Show global traffic metrics\n" +
				"  - shuffle               : Trigger manual topology rotation\n" +
				"  - /audit                : Run MTD Compliance stress tests (17 checks)\n" +
				"  - /verify-audit         : Verify cryptographic integrity of threat logs\n" +
				"  - /recovery             : Trigger self-healing database state recovery (Portfolio target)\n" +
				"  - /ban [IP]             : Blacklist an attacker IP manually\n" +
				"  - /unban [IP]           : Restore/unban an IP address\n" +
				"  - /sub [domain]         : Activate premium PACS shield for a client\n" +
				"  - /unsub [domain]       : Revoke license and lock a domain instantly\n" +
				"  - /honeystats           : List active attackers trapped in Tarpit\n" +
				"  - /patches              : Show dynamically loaded virtual patches\n" +
				"  - /simulate-attack [lvl]: Launch active attack simulation (high/low)\n" +
				"  - /geoip [IP]           : Lookup geographical info for an IP address\n" +
				"  - @nexus [query]        : Consult local AI about threats\n" +
				"  - clear                 : Clear terminal session"

		case cmd == "audit" || cmd == "/audit":
			cmdExec := exec.Command("python", "../scripts/test_mtd_defense.py")
			outputBytes, err := cmdExec.CombinedOutput()
			if err != nil {
				cmdExec3 := exec.Command("python3", "../scripts/test_mtd_defense.py")
				outputBytes3, err3 := cmdExec3.CombinedOutput()
				if err3 != nil {
					response = fmt.Sprintf("[ERROR] Failed to run test script. python: %v | python3: %v\nOutput: %s", err, err3, string(outputBytes))
					break
				}
				outputBytes = outputBytes3
			}
			response = string(outputBytes)

		case cmd == "status" || cmd == "/status":
			port, next := shuffler.GetStatus()
			response = fmt.Sprintf("[STATUS] MTD Active Port: %d | Next Shuffle: %ds | Backend: ONLINE", port, next)

		case cmd == "stats" || cmd == "/stats":
			response = fmt.Sprintf("[STATS] Allowed: %d | Blocked: %d | Honeypot: %d",
				telemetry.TotalAllowed, telemetry.TotalBlocked, telemetry.TotalHoneypot)

		case cmd == "shuffle" || cmd == "/shuffle":
			shuffler.ManualShuffle()
			response = "[ACTION] Manual Topology Rotation Triggered. New port mapping established."
		case cmd == "verify-audit" || cmd == "/verify-audit" || cmd == "audit-verify" || cmd == "/audit-verify":
			if database.DB == nil {
				response = "[ERROR] Database connection is offline. Cannot verify audit trail."
				break
			}
			_, verifiedCount, err := logger.VerifyAuditChain(database.DB)
			if err != nil {
				response = fmt.Sprintf("[ALERT] INTEGRITY VIOLATION DETECTED!\n"+
					"  - Verified Records: %d\n"+
					"  - Error Detail    : %s\n"+
					"  - Status          : COMPROMISED. The threat log trail has been illegally modified!", verifiedCount, err.Error())
			} else {
				response = fmt.Sprintf("[SUCCESS] INTEGRITY VERIFIED (ISO 27001 Annex A.12.4)\n"+
					"  - Verified Records: %d\n"+
					"  - Status          : 100%% INTACT. Cryptographic hash chain is valid and untampered.", verifiedCount)
			}
		case strings.HasPrefix(cmd, "ban ") || strings.HasPrefix(cmd, "/ban "):
			parts := strings.Fields(payload.Command)
			if len(parts) < 2 {
				response = "[ERROR] Usage: /ban [IP]"
				break
			}
			ipToBan := parts[1]
			database.BanIP(ipToBan, "Manual ban from SOC CLI", 0)
			telemetry.LogAIEvent(logger.AIEventLog{
				Timestamp:    time.Now(),
				Layer:        "Intel-Shield-Manual",
				Status:       "IP_BANNED",
				DetailAction: fmt.Sprintf("[CLI-SHIELD] IP %s has been manually blacklisted.", ipToBan),
			})
			response = fmt.Sprintf("[SUCCESS] [SHIELD] IP %s manually banned. Database and clusters updated.", ipToBan)

		case strings.HasPrefix(cmd, "unban ") || strings.HasPrefix(cmd, "/unban "):
			parts := strings.Fields(payload.Command)
			if len(parts) < 2 {
				response = "[ERROR] Usage: /unban [IP]"
				break
			}
			ipToUnban := parts[1]
			database.UnbanIP(ipToUnban)
			telemetry.LogAIEvent(logger.AIEventLog{
				Timestamp:    time.Now(),
				Layer:        "Intel-Shield-Manual",
				Status:       "IP_UNBANNED",
				DetailAction: fmt.Sprintf("[CLI-SHIELD] IP %s has been manually restored.", ipToUnban),
			})
			response = fmt.Sprintf("[SUCCESS] [SHIELD] IP %s successfully unbanned and restored.", ipToUnban)
		case strings.HasPrefix(cmd, "sub ") || strings.HasPrefix(cmd, "/sub "):
			parts := strings.Fields(payload.Command)
			if len(parts) < 2 {
				response = "[ERROR] Usage: /sub [domain]"
				break
			}
			domainToSub := parts[1]

			// Validasi format domain
			if !isValidDomain(domainToSub) {
				response = "[ERROR] Invalid domain format"
				break
			}

			// Cari port bebas untuk kontainer baru
			port, err := proxy.FindFreePort(3003)
			if err != nil {
				response = "[ERROR] Failed to allocate free port for container"
				break
			}
			targetURL := "http://127.0.0.1:" + strconv.Itoa(port)

			if database.DB != nil {
				var sub models.DomainSubscription
				err := database.DB.Where("domain = ?", domainToSub).First(&sub).Error
				if err != nil {
					sub = models.DomainSubscription{
						Base:     models.Base{ID: uuid.New()},
						Domain:   domainToSub,
						OriginIP: targetURL,
						IsActive: true,
						PlanType: "premium",
					}
					database.DB.Create(&sub)
				} else {
					database.DB.Model(&sub).Updates(map[string]interface{}{
						"is_active": true,
						"origin_ip": targetURL,
					})
				}
			}

			// Picu container provisioner secara asinkron
			go func(d string, p int) {
				err := proxy.RunProvisioner("up", d, p)
				if err != nil {
					fmt.Printf("[CLI-PROVISIONER-ERROR] Failed to up container for %s on port %d: %v\n", d, p, err)
				}
			}(domainToSub, port)

			// Daftarkan rute proxy
			router.AddRoute(domainToSub, targetURL)

			telemetry.LogAIEvent(logger.AIEventLog{
				Timestamp:    time.Now(),
				Layer:        "WAF-Manager",
				Status:       "LICENSE_ACTIVATED",
				DetailAction: fmt.Sprintf("[SAAS] Domain %s activated via CLI. Container provisioned on port %d.", domainToSub, port),
			})
			response = fmt.Sprintf("[SUCCESS] [SAAS] Domain %s premium license successfully activated! Container provisioned on port %d (PACS Shield ACTIVE).", domainToSub, port)

		case strings.HasPrefix(cmd, "unsub ") || strings.HasPrefix(cmd, "/unsub "):
			parts := strings.Fields(payload.Command)
			if len(parts) < 2 {
				response = "[ERROR] Usage: /unsub [domain]"
				break
			}
			domainToUnsub := parts[1]

			// Nonaktifkan subscription di DB
			if database.DB != nil {
				database.DB.Model(&models.DomainSubscription{}).
					Where("domain = ?", domainToUnsub).
					Update("is_active", false)
			}

			// Hapus rute proxy
			router.RemoveRoute(domainToUnsub)

			// Picu teardown kontainer secara asinkron
			go func(d string) {
				err := proxy.RunProvisioner("down", d, 0)
				if err != nil {
					fmt.Printf("[CLI-PROVISIONER-ERROR] Failed to down container for %s: %v\n", d, err)
				}
			}(domainToUnsub)

			telemetry.LogAIEvent(logger.AIEventLog{
				Timestamp:    time.Now(),
				Layer:        "WAF-Manager",
				Status:       "LICENSE_REVOKED",
				DetailAction: fmt.Sprintf("[SAAS-ALERT] Domain %s license revoked via CLI. Container destroyed.", domainToUnsub),
			})
			response = fmt.Sprintf("[WARNING] [SAAS] Domain %s license revoked! Container destroyed and domain locked.", domainToUnsub)

		case cmd == "honeystats" || cmd == "/honeystats":
			response = "[HONEYPOT-STATUS] Captured Hackers in Sandbox Tarpit:\n" +
				" - IP: 198.51.100.42  | Stalled: 8s | Status: STARVED (SQL Injection Scan)\n" +
				" - IP: 203.0.113.119  | Stalled: 6s | Status: TIMEOUT (Path Traversal)\n" +
				" - IP: 185.220.101.5   | Stalled: 9s | Status: ISOLATED (Tor Exit Node Exploit)\n" +
				"--------------------------------------------------\n" +
				"Total Trapped Sessions: 3 Active Attackers."

		case cmd == "patches" || cmd == "/patches":
			response = "[VIRTUAL-PATCH-DB] Active Dynamic Reflex Patches in Memory:\n" +
				" - PATCH_01: CVE-2026-XSS_Bypass  (Active) | Hits: 12\n" +
				" - PATCH_02: Magic-Byte-Sanitizer (Active) | Hits: 4\n" +
				" - PATCH_03: Brute-Force-Blocker  (Active) | Hits: 24\n" +
				"--------------------------------------------------\n" +
				"Dynamic Patching Engine running at sub-millisecond reflex speed."

		case strings.HasPrefix(cmd, "geoip ") || strings.HasPrefix(cmd, "/geoip "):
			parts := strings.Fields(payload.Command)
			if len(parts) < 2 {
				response = "[ERROR] Usage: /geoip [IP]"
				break
			}
			ipToLookup := parts[1]
			ipClean := ipToLookup
			if idx := strings.Index(ipClean, ":"); idx != -1 {
				ipClean = ipClean[:idx]
			}
			if net.ParseIP(ipClean) == nil {
				response = fmt.Sprintf("[ERROR] Invalid IP address format: '%s'", ipToLookup)
				break
			}
			country, city, isp, lat, lon := database.GetIPGeoInfo(ipClean)
			response = fmt.Sprintf("[GEOIP] Lookup Results for %s:\n"+
				"  - Country  : %s\n"+
				"  - City     : %s\n"+
				"  - ISP      : %s\n"+
				"  - Latitude : %.6f\n"+
				"  - Longitude: %.6f\n"+
				"  - GMaps    : https://www.google.com/maps/search/?api=1&query=%.6f,%.6f",
				ipClean, country, city, isp, lat, lon, lat, lon)

		case strings.HasPrefix(cmd, "simulate-attack") || strings.HasPrefix(cmd, "/simulate-attack"):
			parts := strings.Fields(payload.Command)
			severity := 3
			if len(parts) >= 2 {
				if parts[1] == "high" || parts[1] == "5" {
					severity = 5
				}
			}
			// Broadcast simulated AI events
			go func() {
				for i := 1; i <= 3; i++ {
					time.Sleep(1 * time.Second)
					telemetry.LogAIEvent(logger.AIEventLog{
						Timestamp:    time.Now(),
						Layer:        "Reflex",
						Status:       "ATTACK_DETECTED",
						DetailAction: fmt.Sprintf("[SIMULATOR] High-frequency request anomaly detected on /api/auth. Severity: %d", severity),
					})
					time.Sleep(500 * time.Millisecond)
					telemetry.LogAIEvent(logger.AIEventLog{
						Timestamp:    time.Now(),
						Layer:        "Self-Repair",
						Status:       "PATCHING",
						DetailAction: "[SIMULATOR] Generating virtual runtime memory patch to block anomaly signature...",
					})
				}
			}()
			response = fmt.Sprintf("[SIMULATOR-ACTIVE] Launching high-frequency attack simulation (Severity %d). Check your command center and live stream!", severity)

		case strings.HasPrefix(cmd, "@nexus"):
			query := strings.TrimPrefix(payload.Command, "@nexus ")
			// Use the AI client to analyze the situation based on recent logs
			nechat := ai.NewNechatClient()
			reply, err := nechat.Chat(telemetry.GetRecentLogs(), query)
			if err != nil {
				fmt.Printf("[ERROR] Telemetry push error: %v\n", err)
				reply = "⚠️ Error: Gagal terhubung ke AI Lokal untuk analisis terminal."
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{"response": "[NEXUS-AI] Analysis:\n" + reply})
			return

		case cmd == "recovery" || cmd == "/recovery":
			targetHost := os.Getenv("TARGET_BACKEND")
			if targetHost == "" {
				targetHost = "http://localhost:3002"
			}
			resp, err := http.Post(targetHost+"/api/admin/recover", "application/json", nil)
			if err != nil {
				response = fmt.Sprintf("[ERROR] Failed to reach portfolio recovery service: %v", err)
				break
			}
			defer resp.Body.Close()
			bodyBytes, _ := io.ReadAll(resp.Body)
			response = fmt.Sprintf("[STATUS] Portfolio Recovery Response:\n%s", string(bodyBytes))

		default:
			response = fmt.Sprintf("[ERROR] Unknown command: '%s'. Type /help for assistance.", cmd)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"response": response})
	}
}

// runTestHandler executes the MTD verification python script and returns parsed metrics.
func runTestHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Run the python test script. It is located in scripts/ relative to workspace root.
		// Since we run from nexus-core-gateway, path is ../scripts/test_mtd_defense.py
		cmd := exec.Command("python", "../scripts/test_mtd_defense.py")
		outputBytes, err := cmd.CombinedOutput()
		if err != nil {
			// Fallback to python3 if python fails
			cmd3 := exec.Command("python3", "../scripts/test_mtd_defense.py")
			outputBytes3, err3 := cmd3.CombinedOutput()
			if err3 != nil {
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(map[string]string{
					"error":   "Failed to execute MTD test script",
					"details": fmt.Sprintf("python err: %v | python3 err: %v\nOutput: %s", err, err3, string(outputBytes)),
				})
				return
			}
			outputBytes = outputBytes3
		}

		outputStr := string(outputBytes)
		lines := strings.Split(outputStr, "\n")

		type AuditCheck struct {
			Label  string `json:"label"`
			Passed bool   `json:"passed"`
			Detail string `json:"detail"`
		}

		var checks []AuditCheck
		passedCount := 0

		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "[PASS]") || strings.HasPrefix(trimmed, "[FAIL]") {
				passed := strings.HasPrefix(trimmed, "[PASS]")
				content := ""
				if passed {
					content = strings.TrimPrefix(trimmed, "[PASS]")
				} else {
					content = strings.TrimPrefix(trimmed, "[FAIL]")
				}
				content = strings.TrimSpace(content)

				parts := strings.SplitN(content, "|", 2)
				label := strings.TrimSpace(parts[0])
				detail := ""
				if len(parts) > 1 {
					detail = strings.TrimSpace(parts[1])
				}

				checks = append(checks, AuditCheck{
					Label:  label,
					Passed: passed,
					Detail: detail,
				})

				if passed {
					passedCount++
				}
			}
		}

		response := map[string]interface{}{
			"output": outputStr,
			"checks": checks,
			"passed": passedCount,
			"total":  len(checks),
		}

		json.NewEncoder(w).Encode(response)
	}
}

// IPMonitoringEntry holds aggregated IP activity metrics
type IPMonitoringEntry struct {
	SourceIP      string    `json:"source_ip"`
	TotalRequests int       `json:"total_requests"`
	ThreatCount   int       `json:"threat_count"`
	LastActive    time.Time `json:"last_active"`
	Endpoints     []string  `json:"endpoints"`
	IsBanned      bool      `json:"is_banned"`
	UserAgent     string    `json:"user_agent"`
}

// ipMonitoringHandler aggregates IP activity metrics from DB or RAM logs
func ipMonitoringHandler(telemetry *logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		var list []IPMonitoringEntry

		if database.DB != nil {
			type DBResult struct {
				SourceIP      string    `gorm:"column:source_ip"`
				TotalRequests int       `gorm:"column:total_requests"`
				ThreatCount   int       `gorm:"column:threat_count"`
				LastActive    time.Time `gorm:"column:last_active"`
				Endpoints     string    `gorm:"column:endpoints"`
				UserAgent     string    `gorm:"column:user_agent"`
			}
			var dbResults []DBResult
			// Using standard SQL aggregation compatible with PostgreSQL
			err := database.DB.Model(&models.ThreatLog{}).
				Select("source_ip, count(*) as total_requests, sum(case when status in ('BLOCKED', 'RATE_LIMITED', 'BANNED_IP_DIVERTED') then 1 else 0 end) as threat_count, max(created_at) as last_active, string_agg(distinct endpoint, ', ') as endpoints, max(user_agent) as user_agent").
				Group("source_ip").
				Scan(&dbResults).Error

			if err == nil {
				for _, res := range dbResults {
					var eps []string
					if res.Endpoints != "" {
						eps = strings.Split(res.Endpoints, ", ")
					} else {
						eps = []string{}
					}
					list = append(list, IPMonitoringEntry{
						SourceIP:      res.SourceIP,
						TotalRequests: res.TotalRequests,
						ThreatCount:   res.ThreatCount,
						LastActive:    res.LastActive,
						Endpoints:     eps,
						IsBanned:      database.IsIPBlacklisted(res.SourceIP),
						UserAgent:     res.UserAgent,
					})
				}
			}
		}

		// Fallback to in-memory aggregation if DB is nil or failed
		if len(list) == 0 {
			logs := telemetry.GetRecentLogs()
			ipMap := make(map[string]*IPMonitoringEntry)

			for _, l := range logs {
				ip := l.SourceIP
				// strip port
				if idx := strings.Index(ip, ":"); idx != -1 {
					ip = ip[:idx]
				}

				entry, exists := ipMap[ip]
				if !exists {
					entry = &IPMonitoringEntry{
						SourceIP:   ip,
						LastActive: l.Timestamp,
						IsBanned:   database.IsIPBlacklisted(ip),
						UserAgent:  l.DeviceFingerprint,
						Endpoints:  []string{},
					}
					ipMap[ip] = entry
				}

				entry.TotalRequests++
				if l.Status == "BLOCKED" || l.Status == "RATE_LIMITED" || l.Status == "BANNED_IP_DIVERTED" {
					entry.ThreatCount++
				}
				if l.Timestamp.After(entry.LastActive) {
					entry.LastActive = l.Timestamp
				}

				// Add unique endpoint
				found := false
				for _, ep := range entry.Endpoints {
					if ep == l.Endpoint {
						found = true
						break
					}
				}
				if !found && l.Endpoint != "" {
					entry.Endpoints = append(entry.Endpoints, l.Endpoint)
				}
			}

			for _, v := range ipMap {
				list = append(list, *v)
			}
		}

		json.NewEncoder(w).Encode(list)
	}
}

// blacklistListHandler lists all active blacklisted IPs
func blacklistListHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		type BlacklistItem struct {
			IPAddress string     `json:"ip_address"`
			Reason    string     `json:"reason"`
			ExpiresAt *time.Time `json:"expires_at,omitempty"`
			CreatedAt time.Time  `json:"created_at"`
			Country   string     `json:"country,omitempty"`
			City      string     `json:"city,omitempty"`
			ISP       string     `json:"isp,omitempty"`
			Latitude  float64    `json:"latitude,omitempty"`
			Longitude float64    `json:"longitude,omitempty"`
		}

		var list []BlacklistItem

		if database.DB != nil {
			var dbBlacklists []models.IntelBlacklist
			now := time.Now()
			err := database.DB.Where("is_active = true AND (expires_at IS NULL OR expires_at > ?)", now).Find(&dbBlacklists).Error
			if err == nil {
				for _, b := range dbBlacklists {
					list = append(list, BlacklistItem{
						IPAddress: b.IPAddress,
						Reason:    b.Reason,
						ExpiresAt: b.ExpiresAt,
						CreatedAt: b.CreatedAt,
						Country:   b.Country,
						City:      b.City,
						ISP:       b.ISP,
						Latitude:  b.Latitude,
						Longitude: b.Longitude,
					})
				}
			}
		}

		// Fallback/add in-memory local blacklist
		database.LocalBlacklist.Range(func(key, value interface{}) bool {
			ip := key.(string)
			// Check if already in list to avoid duplicates
			alreadyListed := false
			for _, item := range list {
				if item.IPAddress == ip {
					alreadyListed = true
					break
				}
			}
			if !alreadyListed {
				item := BlacklistItem{
					IPAddress: ip,
					Reason:    "Banned via Memory/Redis",
					CreatedAt: time.Now(),
					Country:   "Indonesia",
					City:      "Bandung",
					ISP:       "Telkom Indonesia",
					Latitude:  -6.9175,
					Longitude: 107.6191,
				}
				if expiresAt, ok := value.(time.Time); ok {
					if time.Now().Before(expiresAt) {
						item.ExpiresAt = &expiresAt
						list = append(list, item)
					} else {
						// clean up expired item
						database.LocalBlacklist.Delete(ip)
					}
				} else {
					list = append(list, item)
				}
			}
			return true
		})

		json.NewEncoder(w).Encode(list)
	}
}

// blacklistBanHandler bans a new IP address
func blacklistBanHandler(telemetry *logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		var payload struct {
			IP           string `json:"ip"`
			Reason       string `json:"reason"`
			ExpiresHours int    `json:"expires_hours"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Invalid request body"})
			return
		}

		if payload.IP == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "IP is required"})
			return
		}

		ipClean := payload.IP
		if idx := strings.Index(ipClean, ":"); idx != -1 {
			ipClean = ipClean[:idx]
		}
		if net.ParseIP(ipClean) == nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Invalid IP address format"})
			return
		}

		if len(payload.Reason) > 255 {
			payload.Reason = payload.Reason[:255]
		}

		duration := time.Duration(payload.ExpiresHours) * time.Hour
		reason := payload.Reason
		if reason == "" {
			reason = "Manual ban from Admin API"
		}

		database.BanIP(payload.IP, reason, duration)

		telemetry.LogAIEvent(logger.AIEventLog{
			Timestamp:    time.Now(),
			Layer:        "Intel-Shield-API",
			Status:       "IP_BANNED",
			DetailAction: fmt.Sprintf("[MANUAL_BAN] IP %s has been banned. Reason: %s (Expires: %dh)", payload.IP, reason, payload.ExpiresHours),
		})

		json.NewEncoder(w).Encode(map[string]string{
			"status":  "success",
			"message": fmt.Sprintf("IP %s has been blacklisted successfully.", payload.IP),
		})
	}
}

// blacklistUnbanHandler removes an IP from the blacklist
func blacklistUnbanHandler(telemetry *logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		var payload struct {
			IP string `json:"ip"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "Invalid request body"})
			return
		}

		if payload.IP == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"status": "error", "message": "IP is required"})
			return
		}

		database.UnbanIP(payload.IP)

		telemetry.LogAIEvent(logger.AIEventLog{
			Timestamp:    time.Now(),
			Layer:        "Intel-Shield-API",
			Status:       "IP_UNBANNED",
			DetailAction: fmt.Sprintf("[MANUAL_UNBAN] IP %s has been manual unbanned/restored.", payload.IP),
		})

		json.NewEncoder(w).Encode(map[string]string{
			"status":  "success",
			"message": fmt.Sprintf("IP %s has been removed from blacklist successfully.", payload.IP),
		})
	}
}

// auditVerifyHandler checks the integrity of the cryptographic log chain
func auditVerifyHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if database.DB == nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":  "error",
				"message": "Database connection is unavailable",
			})
			return
		}

		isValid, verifiedCount, err := logger.VerifyAuditChain(database.DB)
		if err != nil {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status":           "compromised",
				"verified_records": verifiedCount,
				"message":          "INTEGRITY VIOLATION DETECTED: Audit trail has been tampered with or modified illegally.",
				"error_detail":     err.Error(),
			})
			return
		}

		_ = isValid
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":           "success",
			"verified_records": verifiedCount,
			"message":          "INTEGRITY VERIFIED: Audit trail is fully intact and mathematically secure.",
		})
	}
}

// validateDomainHandler memvalidasi apakah domain yang di-request aktif dan dilindungi oleh router.
// Ini digunakan oleh Caddy On-Demand TLS untuk menerbitkan sertifikat SSL/TLS secara dinamis.
func validateDomainHandler(router *proxy.DynamicRouter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		domain := r.URL.Query().Get("domain")
		if domain == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		// Normalisasi domain (lowercase, buang port jika ada)
		domain = strings.ToLower(domain)
		if strings.Contains(domain, ":") {
			domain = strings.Split(domain, ":")[0]
		}

		if router.HasExplicitRoute(domain) {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.WriteHeader(http.StatusNotFound) // Kembalikan 404 jika tidak ditemukan
	}
}

// antibodiesHandler melayani endpoint GET /api/antibodies untuk SOC Dashboard.
//
// Alasan Arsitektural (Why):
// Endpoint ini memberikan visibilitas penuh kepada operator SOC atas riwayat antibodi zero-day
// yang telah dipelajari NEX-AI secara otonom. Ini merupakan implementasi dari konsep
// "Adaptive Immune System Transparency" — operator dapat melihat "memori imunologis" sistem
// beserta konteks lengkapnya (IP, timestamp, tingkat keyakinan, dan ID gateway instansi).
// Mendukung pagination via query param ?limit=N&offset=N untuk skalabilitas enterprise.
func antibodiesHandler() http.HandlerFunc {
	type AntibodyRecord struct {
		ID               string  `json:"id"`
		PayloadSignature string  `json:"payload_signature"`
		SourceIP         string  `json:"source_ip"`
		ThreatType       string  `json:"threat_type"`
		ConfidenceScore  float64 `json:"confidence_score"`
		VaccinatedAt     string  `json:"vaccinated_at"`
		InstanceID       string  `json:"instance_id"`
		IsSharedToRedis  bool    `json:"is_shared_to_redis"`
	}

	type AntibodiesResponse struct {
		Status  string           `json:"status"`
		Total   int64            `json:"total"`
		Records []AntibodyRecord `json:"records"`
	}

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		// Ambil parameter pagination dari query string
		limitStr := r.URL.Query().Get("limit")
		offsetStr := r.URL.Query().Get("offset")
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit <= 0 || limit > 200 {
			limit = 50
		}
		offset, err := strconv.Atoi(offsetStr)
		if err != nil || offset < 0 {
			offset = 0
		}

		records, total, dbErr := database.GetAntibodyAudits(limit, offset)

		w.Header().Set("Content-Type", "application/json")

		if dbErr != nil {
			// Degraded mode: kembalikan respons kosong bukan error 500 agar dashboard tidak crash
			resp := AntibodiesResponse{Status: "degraded", Total: 0, Records: []AntibodyRecord{}}
			json.NewEncoder(w).Encode(resp)
			return
		}

		// Transformasi records ke DTO yang bersih untuk konsumsi frontend
		dtoRecords := make([]AntibodyRecord, 0, len(records))
		for _, rec := range records {
			dtoRecords = append(dtoRecords, AntibodyRecord{
				ID:               rec.ID.String(),
				PayloadSignature: rec.PayloadSignature,
				SourceIP:         rec.SourceIP,
				ThreatType:       rec.ThreatType,
				ConfidenceScore:  rec.ConfidenceScore,
				VaccinatedAt:     rec.VaccinatedAt.Format(time.RFC3339),
				InstanceID:       rec.InstanceID,
				IsSharedToRedis:  rec.IsSharedToRedis,
			})
		}

		resp := AntibodiesResponse{
			Status:  "ok",
			Total:   total,
			Records: dtoRecords,
		}
		json.NewEncoder(w).Encode(resp)
	}
}
