package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/mtd"
	"github.com/nexus-cyber/nexus-core-gateway/internal/proxy"
	"github.com/nexus-cyber/nexus-core-gateway/pkg/logger"
)

func registerPublicMux(gatewayHandler http.Handler, gateway *proxy.NexusProxy, telemetry *logger.Logger) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/upload", uploadShieldHandler(gateway, telemetry))
	mux.HandleFunc("/api/unlock-reward", rewardUnlockHandler(telemetry))
	mux.HandleFunc("/api/photos", guestPhotosListHandler())
	mux.HandleFunc("/api/guest-photos/", guestPhotoFileHandler())
	mux.HandleFunc("/api/webhook/payment", paymentWebhookHandler(gateway.Router, telemetry))
	mux.HandleFunc("/api/verify-session", gateway.VerifySessionHandler)
	mux.HandleFunc("/api/csrf-token", csrfTokenHandler())
	mux.HandleFunc("/api/license/validate-domain", validateDomainHandler(gateway.Router))
	mux.HandleFunc("/nexred/lab/antibody-signal", proxy.AntibodySignalHandler(gateway))
	mux.HandleFunc("/nexred/lab/vaccine-probe", proxy.LabVaccineProbeHandler(gateway))
	mux.Handle("/", gatewayHandler)
	return mux
}

func registerAdminMux(gateway *proxy.NexusProxy, telemetry *logger.Logger, shuffler *mtd.TopologyShuffler, target string) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/routes", routesHandler(gateway.Router, telemetry))
	mux.HandleFunc("/api/telemetry", telemetryHandler(shuffler, telemetry, target))
	mux.HandleFunc("/api/ai-events", aiEventsHandler(telemetry))
	mux.HandleFunc("/api/ai/stream", aiStreamHandler())
	mux.HandleFunc("/api/ai/status", aiStatusHandler())
	mux.HandleFunc("/api/cli/execute", proxy.RequirePOST(cliExecuteHandler(telemetry, shuffler, gateway.Router)))
	mux.HandleFunc("/api/logs", telemetryHandler(shuffler, telemetry, target))
	mux.HandleFunc("/api/domains", xxxDomainsHandler(telemetry, gateway.Router))
	mux.HandleFunc("/api/nechat", proxy.RequirePOST(nechatHandler(telemetry)))
	mux.HandleFunc("/api/panic", proxy.RequirePOST(panicHandler(shuffler, telemetry)))
	mux.HandleFunc("/api/report/generate", proxy.RequirePOST(reportGenerateHandler(telemetry)))
	mux.HandleFunc("/api/stream/threats", threatsStreamHandler(gateway))
	mux.HandleFunc("/api/ip-monitoring", ipMonitoringHandler(telemetry))
	mux.HandleFunc("/api/incidents/digest", incidentDigestHandler())
	mux.HandleFunc("/api/blacklist", blacklistListHandler())
	mux.HandleFunc("/api/blacklist/ban", proxy.RequirePOST(blacklistBanHandler(telemetry)))
	mux.HandleFunc("/api/blacklist/unban", proxy.RequirePOST(blacklistUnbanHandler(telemetry)))
	mux.HandleFunc("/api/audit/verify", auditVerifyHandler())
	mux.HandleFunc("/api/antibodies", antibodiesHandler())
	mux.HandleFunc("/api/jobs", jobsHandler())
	mux.HandleFunc("/api/jobs/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/approve") {
			jobApproveHandler()(w, r)
			return
		}
		jobByIDHandler()(w, r)
	})
	mux.HandleFunc("/api/host-immune", hostImmuneHandler())
	mux.HandleFunc("/api/system/reset", proxy.RequirePOST(systemResetHandler(gateway, telemetry)))
	mux.HandleFunc("/api/test/run", proxy.RequirePOST(runTestHandler()))
	mux.HandleFunc("/api/csrf-token", csrfTokenHandler())
	mux.HandleFunc("/api/admin/login", proxy.AdminLoginHandler(os.Getenv("NEXUS_ADMIN_TOKEN")))
	mux.HandleFunc("/api/admin/logout", proxy.AdminLogoutHandler())
	return mux
}

func systemResetHandler(gateway *proxy.NexusProxy, telemetry *logger.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		telemetry.ResetAll()
		gateway.ResetAntibodies()
		gateway.PurgeGoldenGETCache()
		if mtd.MtdRedis != nil && mtd.MtdRedis.Enabled {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()
			mtd.MtdRedis.Client.FlushDB(ctx)
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"success","message":"System metrics and AI memory cleared across RAM and Redis."}`)
	}
}
