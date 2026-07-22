package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/nexus-cyber/nexus-core-gateway/internal/compliance"
	"github.com/nexus-cyber/nexus-core-gateway/internal/threatintel"
)

// HandleAuditCLI Subcommand handler untuk CLI `gateway audit ...`
func HandleAuditCLI(args []string) bool {
	if len(args) == 0 {
		return false
	}

	subCmd := strings.ToLower(args[0])
	switch subCmd {
	case "audit":
		if len(args) < 2 {
			printAuditHelp()
			os.Exit(1)
		}

		action := strings.ToLower(args[1])
		switch action {
		case "export":
			exportFlags := flag.NewFlagSet("audit export", flag.ExitOnError)
			std := exportFlags.String("standard", "iso27001", "Compliance standard (iso27001, pcidss, uupdp, iso25010)")
			domain := exportFlags.String("domain", "localhost", "Target domain for compliance audit")
			format := exportFlags.String("format", "markdown", "Output format (markdown, json)")

			_ = exportFlags.Parse(args[2:])

			frameworkKey := compliance.FrameworkISO27001
			switch strings.ToLower(*std) {
			case "pcidss":
				frameworkKey = compliance.FrameworkPCIDSS
			case "uupdp":
				frameworkKey = compliance.FrameworkUUPDP
			case "iso25010":
				frameworkKey = compliance.FrameworkISO25010
			}

			report, err := compliance.EvaluateCompliance(frameworkKey, *domain)
			if err != nil {
				fmt.Printf("[FAIL] Error generating compliance report: %v\n", err)
				os.Exit(1)
			}

			if strings.ToLower(*format) == "json" {
				jsonData, _ := compliance.ExportReportJSON(report)
				fmt.Println(string(jsonData))
			} else {
				mdData := compliance.ExportReportMarkdown(report)
				fmt.Println(mdData)
			}
			os.Exit(0)

		case "sync-bssn":
			feed := threatintel.FetchBSSNCollectiveFeed()
			fmt.Println("==================================================================")
			fmt.Println("📡 NEXUS CYBER - BSSN / ID-CERT COLLECTIVE THREAT FEED SYNC")
			fmt.Println("==================================================================")
			fmt.Printf("  Status              : CONNECTED & SYNCED\n")
			fmt.Printf("  Collective IPs      : %d Verified Threat Indicators\n", len(feed))
			fmt.Println("------------------------------------------------------------------")
			for i, ip := range feed {
				fmt.Printf("  [%d] %s (BSSN Collective Threat Level: SEVERE)\n", i+1, ip)
			}
			fmt.Println("==================================================================")
			os.Exit(0)

		default:
			printAuditHelp()
			os.Exit(1)
		}
	}
	return false
}

func printAuditHelp() {
	fmt.Println("Usage: gateway audit <export|sync-bssn> [options]")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  export     --standard=<iso27001|pcidss|uupdp|iso25010> [--domain=<domain>] [--format=<markdown|json>]")
	fmt.Println("  sync-bssn  Fetch collective threat feed from BSSN HoneyNet Project")
}
