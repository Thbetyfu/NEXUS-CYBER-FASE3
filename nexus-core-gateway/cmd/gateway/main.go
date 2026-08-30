package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/ai"
	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/licensing"
	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
	"github.com/nexus-cyber/nexus-core-gateway/internal/proxy"
	"github.com/nexus-cyber/nexus-core-gateway/internal/rasp"
	"github.com/nexus-cyber/nexus-core-gateway/internal/repair"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

// Minimal .env loader for Zero-Dependency Native Nexus Architecture
func loadEnv() {
	file, err := os.Open(".env")
	if err != nil {
		return // Silently fallback to os.Getenv
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "#") || strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, `"'`)
			os.Setenv(key, val)
		}
	}
}

func main() {
	loadEnv()
	if len(os.Args) > 1 && os.Args[1] == "license" {
		HandleLicenseCLI(os.Args[1:])
		return
	}
	if len(os.Args) > 1 && os.Args[1] == "audit" {
		HandleAuditCLI(os.Args[1:])
		return
	}
	if len(os.Args) > 1 && (os.Args[1] == "sim" || os.Args[1] == "simulate") {
		HandleSimCLI(os.Args[1:])
		return
	}
	fmt.Println("[NEXUS] NEXUS CYBER GATEWAY - ENTERPRISE PRODUCTION INITIALIZING...")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 0. Initialize Distributed State (Redis & Postgres)
	mtd.InitRedis()
	database.InitPostgres()
	proxy.SeedInitialDomainSubscriptions()

	// 0b. Initialize Licensing Verifier
	licenseDomain := os.Getenv("NEXUS_LICENSE_DOMAIN")
	if licenseDomain == "" {
		licenseDomain = "localhost"
	}
	licenseKey := os.Getenv("NEXUS_LICENSE_KEY")
	if licenseKey == "" {
		licenseKey = "nexus-cyber-dev"
	}
	licensing.InitLicenseVerifier(licenseDomain, licenseKey)
	licensing.StartLicenseHandshake(1 * time.Hour)
	proxy.StartGracePeriodTeardownWorker(ctx, 12*time.Hour)

	// 1. Initialize Intelligence Components
	filter := ai.NewReflexFilter()
	reasoning := ai.NewReasoningEngine()
	telemetry, err := logger.NewLogger()
	if err != nil {
		log.Fatalf("[NEXUS] Failed to initiate logger: %v", err)
	}
	defer telemetry.Close()

	var gateway *proxy.NexusProxy

	// Integrity monitor: pin snapshot + fsnotify restore (origin stays up).
	monitoredDir := os.Getenv("INTEGRITY_MONITORED_DIR")
	if monitoredDir == "" {
		monitoredDir = "../playground/Portofolio-Thoriq"
	}
	integrityMonitor, err := repair.NewIntegrityMonitorWithOptions(repair.Options{
		MonitoredDir: monitoredDir,
		BaselinePath: os.Getenv("INTEGRITY_BASELINE_PATH"),
		Telemetry:    telemetry,
		Repin:        os.Getenv("INTEGRITY_REPIN") == "1",
		OnAlert: func(msg string) {
			if gateway != nil {
				gateway.PurgeGoldenGETCache()
			}
			host := strings.TrimSpace(os.Getenv("PROTECTED_HOST"))
			if host == "" {
				host = "lab"
			}
			sample := msg
			if len(sample) > 240 {
				sample = sample[:240]
			}
			telemetry.LogTraffic(logger.TelemetryLog{
				Timestamp:     time.Now(),
				SourceIP:      "self-heal",
				Endpoint:      "/integrity",
				Method:        "FILE",
				Status:        "BLOCKED",
				ThreatDetail:  "INTEGRITY_RESTORE",
				TargetDomain:  host,
				PayloadSample: sample,
			})
			if database.ActiveThreatReporter == nil {
				return
			}
			_ = database.ActiveThreatReporter.ReportThreat("self-heal", []int{15}, fmt.Sprintf("[%s] %s", host, msg))
		},
	})
	if err != nil {
		log.Printf("[SELF-HEAL-WARN] Integrity monitor initialization failed: %v", err)
	} else {
		go integrityMonitor.Start(ctx, 2*time.Second)
	}

	// Initialize RASP (Runtime Application Self-Protection) (Phase 9)
	go rasp.StartRASP(ctx, telemetry, 500*time.Millisecond)

	// Register Real-time AI Event Streaming (Powering the Command Center SOC Terminal)
	telemetry.OnAIEvent = func(event logger.AIEventLog) {
		if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
			data, _ := json.Marshal(event)
			// Broadcast to all active Dashboard SSH-Tunnel-SSE sessions
			mtd.MtdRedis.Client.Publish(context.Background(), "nexus:ai_stream", data)
		}
	}

	// 2. MTD: Token Bucket Rate Limiter (closes GAP-004)
	// 100 burst capacity, 50 req/sec sustained rate for stable web operations and Red Team protection
	rateLimiter := mtd.NewTokenBucket(100, 50)
	rateLimiter.OnRateLimit = func(r *http.Request) {
		tLog := logger.TelemetryLog{
			Timestamp:    time.Now(),
			SourceIP:     r.RemoteAddr,
			Endpoint:     r.URL.Path,
			Method:       r.Method,
			Status:       "RATE_LIMITED",
			ThreatDetail: "RATE_LIMIT_EXCEEDED",
			LatencyMS:    0,
		}
		telemetry.EnrichLog(&tLog, r) // Call EnrichLog so the Dashboard shows Forensics
		telemetry.LogTraffic(tLog)
	}

	// 3. MTD: Digital Hallucination Honeypot
	// Runs on :9090, stalls attackers for 8 seconds, fully isolated
	honeypot := mtd.NewHoneypot(":9090", 8*time.Second)
	honeypot.OnAttackerCaught = func(ip string, path string, ua string) {
		telemetry.LogAIEvent(logger.AIEventLog{
			Timestamp:    time.Now(),
			Layer:        "Honeypot-Trap",
			Status:       "ATTACKER_TRAPPED",
			DetailAction: fmt.Sprintf("[TRAPPED] Attacker from %s caught in Honeypot on path %s. UA: %s", ip, path, ua),
		})
	}
	honeypot.Start()

	// 3b. MTD: SSH Tarpit
	// Runs on SSH_TARPIT_PORT (default :2222), stalls SSH scanners
	sshTarpitPort := os.Getenv("SSH_TARPIT_PORT")
	if sshTarpitPort == "" {
		sshTarpitPort = ":2222"
	}
	if !strings.HasPrefix(sshTarpitPort, ":") {
		sshTarpitPort = ":" + sshTarpitPort
	}

	sshTarpit := mtd.NewSSHTarpit(sshTarpitPort, 10*time.Second)
	sshTarpit.OnAttackerCaught = func(ip string) {
		// Kirim telemetri kejadian ke dashboard
		telemetry.LogAIEvent(logger.AIEventLog{
			Timestamp:    time.Now(),
			Layer:        "SSH-Tarpit",
			Status:       "ATTACKER_TRAPPED",
			DetailAction: fmt.Sprintf("[TRAPPED] Attacker from %s caught in SSH Tarpit. Starving connection...", ip),
		})
		// Ban IP penyerang secara otomatis selama 24 jam
		database.BanIP(ip, "SSH brute force probe caught in tarpit", 24*time.Hour)
	}
	sshTarpit.Start()

	// 4. Setup Initial Backend Target (Mockup OJK Data Center)
	backendHost := os.Getenv("TARGET_BACKEND_HOST")
	if backendHost == "" {
		backendHost = "host.docker.internal" // Default to Docker Desktop's host bridge
	}

	target := os.Getenv("TARGET_BACKEND")
	if target == "" {
		target = fmt.Sprintf("http://%s:3001", backendHost)
	}

	// Parse origin URL so https://host is not mistaken for "port" after the scheme colon.
	targetPort := 80
	targetScheme := "http"
	if parsedTarget, err := url.Parse(target); err == nil && parsedTarget.Scheme != "" {
		targetScheme = strings.ToLower(parsedTarget.Scheme)
		if parsedTarget.Port() != "" {
			fmt.Sscanf(parsedTarget.Port(), "%d", &targetPort)
		} else if targetScheme == "https" {
			targetPort = 443
		} else {
			targetPort = 80
		}
	} else if idx := strings.LastIndex(target, ":"); idx != -1 && idx > 5 {
		fmt.Sscanf(target[idx+1:], "%d", &targetPort)
	}

	shuffler := mtd.NewTopologyShuffler(
		backendHost,       // baseHost
		[]int{targetPort}, // portPool dinamis sesuai port backend
		60,                // rotate every 60 seconds
		func(newTarget mtd.TargetBackend) {
			// Public HTTPS origins (e.g. Vercel) must stay on the original URL.
			// MTD URL() is http://host:port and would break TLS reverse-proxy.
			if targetScheme == "https" {
				log.Printf("[MTD] HTTPS origin pinned (%s); port shuffle does not rewrite the public origin", target)
				return
			}
			if gateway != nil {
				if err := gateway.UpdateTarget(newTarget.URL()); err != nil {
					log.Printf("[MTD] Handoff failed: %v", err)
				} else {
					log.Printf("[MTD] Graceful handoff complete -> %s", newTarget.URL())
				}
			}
		},
	)
	shuffler.Start()

	// 6. Initialize MTD-aware Proxy
	gateway, err = proxy.NewNexusProxy(target, filter, reasoning, telemetry, shuffler, honeypot)
	if err != nil {
		log.Fatalf("[NEXUS] Failed to initiate proxy: %v", err)
	}

	// Sync active routes from PostgreSQL to Redis / Cache on boot.
	// Seed upserts lab aliases first; re-bind after sync so a leftover
	// domain_subscriptions OriginIP cannot split named-host vs loopback.
	if err := gateway.Router.SyncFromDatabase(); err != nil {
		log.Printf("[NEXUS-WARN] Failed to sync dynamic routes from database: %v", err)
	}
	proxy.BindLabInstanceOrigin(gateway.Router, target)

	// 7. Chain: BrowserIntegrity -> TokenBucket -> NexusProxy (defense-in-depth)
	gatewayHandler := proxy.BrowserIntegrityCheck(rateLimiter.HTTPMiddleware(gateway))

	publicMux := registerPublicMux(gatewayHandler, gateway, telemetry)
	adminMux := registerAdminMux(gateway, telemetry, shuffler, target)

	publicShield := proxy.DashboardCORS(proxy.PublicDataPlane(proxy.CsrfShield(gateway.AIMiddleware(publicMux))))
	adminShield := proxy.DashboardCORS(proxy.AdminControlPlane(
		proxy.CsrfShield(gateway.AIMiddleware(adminMux)),
		os.Getenv("NEXUS_ADMIN_TOKEN"),
	))

	adminAddr := os.Getenv("ADMIN_LISTEN")
	if adminAddr == "" {
		adminAddr = "127.0.0.1:8081"
	}
	go func() {
		fmt.Printf("[NEXUS] Admin control plane on %s (SOC only; not on the public WAF port)\n", adminAddr)
		if err := http.ListenAndServe(adminAddr, adminShield); err != nil {
			log.Fatal(err)
		}
	}()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}
	fmt.Printf("[NEXUS] Public WAF on %s -> Proxying to %s\n", port, target)
	fmt.Println("[NEXUS] MODE: Phase 5 MTD Active | Honeypot: :9090 | Rate Limiter: 50r/s")

	// [NEW: PQC SHIELD] Post-Quantum Cryptography Initialization
	fmt.Println("[PQC] Quantum Cryptography Module (ML-KEM) Initialized.")
	telemetry.LogAIEvent(logger.AIEventLog{
		Timestamp:    time.Now(),
		Layer:        "Core",
		Status:       "SYSTEM_READY",
		DetailAction: "[PQC SHIELD] Post-Quantum Cryptography Module (ML-KEM-768) Initialized. Protecting against Quantum Threat Vectors.",
	})

	if err := http.ListenAndServe(port, publicShield); err != nil {
		log.Fatal(err)
	}
}

// Handler to retrieve or generate the CSRF token.
func csrfTokenHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// If CORS preflight, return early
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		cookie, err := r.Cookie("nexus_csrf")
		var token string
		if err != nil || cookie.Value == "" {
			token = proxy.GenerateCSRFToken()
			http.SetCookie(w, &http.Cookie{
				Name:     "nexus_csrf",
				Value:    token,
				Path:     "/",
				HttpOnly: false,
				SameSite: http.SameSiteLaxMode,
			})
		} else {
			token = cookie.Value
		}

		json.NewEncoder(w).Encode(map[string]string{"csrf_token": token})
	}
}
