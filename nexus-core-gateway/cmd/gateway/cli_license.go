package main

import (
	"flag"
	"fmt"
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/licensing"
)

// HandleLicenseCLI Subcommand handler untuk CLI `gateway license ...`
func HandleLicenseCLI(args []string) bool {
	if len(args) == 0 {
		return false
	}

	subCmd := strings.ToLower(args[0])
	switch subCmd {
	case "license":
		if len(args) < 2 {
			printLicenseHelp()
			os.Exit(1)
		}

		action := strings.ToLower(args[1])
		switch action {
		case "generate":
			genFlags := flag.NewFlagSet("license generate", flag.ExitOnError)
			domain := genFlags.String("domain", "localhost", "Target domain for the license")
			cores := genFlags.Int("cores", 8, "Maximum allowed CPU cores")
			tier := genFlags.String("tier", "ultrasafe", "Subscription tier (free, basic, pro, pro_plus, ultrasafe)")
			years := genFlags.Int("years", 1, "License validity duration in years")
			po := genFlags.String("po", "", "Optional B2G PO/LKPP procurement bypass code")

			_ = genFlags.Parse(args[2:])

			secretKey := os.Getenv("NEXUS_LICENSE_SECRET")
			claims := licensing.LicenseClaims{
				Domain:    *domain,
				CpuCores:  *cores,
				Tier:      strings.ToLower(*tier),
				IssuedAt:  time.Now().Unix(),
				ExpiresAt: time.Now().Add(time.Duration(*years) * 365 * 24 * time.Hour).Unix(),
				BypassPO:  *po,
			}

			key, err := licensing.GenerateLicenseKey(claims, secretKey)
			if err != nil {
				fmt.Printf("[FAIL] Error generating license key: %v\n", err)
				os.Exit(1)
			}

			fmt.Println("==================================================================")
			fmt.Println("🔑 NEXUS CYBER - ENTERPRISE LICENSE KEY GENERATOR")
			fmt.Println("==================================================================")
			fmt.Printf("  Domain Target  : %s\n", claims.Domain)
			fmt.Printf("  Subscription   : %s\n", strings.ToUpper(claims.Tier))
			fmt.Printf("  Max CPU Cores  : %d Cores\n", claims.CpuCores)
			fmt.Printf("  B2G Recognized : %t\n", licensing.IsGovernmentOrEduDomain(claims.Domain))
			fmt.Printf("  Expires At     : %s\n", time.Unix(claims.ExpiresAt, 0).Format("2006-01-02 15:04:05 MST"))
			if *po != "" {
				fmt.Printf("  B2G PO Bypass  : %s\n", *po)
			}
			fmt.Println("------------------------------------------------------------------")
			fmt.Printf("  LICENSE KEY    : %s\n", key)
			fmt.Println("==================================================================")
			os.Exit(0)

		case "verify":
			verifyFlags := flag.NewFlagSet("license verify", flag.ExitOnError)
			key := verifyFlags.String("key", "", "License key string to verify")
			domain := verifyFlags.String("domain", "localhost", "Current host domain")

			_ = verifyFlags.Parse(args[2:])

			if *key == "" {
				fmt.Println("[FAIL] Missing required --key argument.")
				os.Exit(1)
			}

			secretKey := os.Getenv("NEXUS_LICENSE_SECRET")
			claims, err := licensing.ParseAndVerifyLicenseKey(*key, *domain, runtime.NumCPU(), secretKey)
			if err != nil {
				fmt.Printf("[FAIL] License verification failed: %v\n", err)
				os.Exit(1)
			}

			fmt.Println("==================================================================")
			fmt.Println("✅ NEXUS CYBER - LICENSE VERIFICATION PASSED")
			fmt.Println("==================================================================")
			fmt.Printf("  Status        : ACTIVE & VALID\n")
			fmt.Printf("  Tier          : %s\n", strings.ToUpper(claims.Tier))
			fmt.Printf("  Allowed Cores : %d (Host: %d)\n", claims.CpuCores, runtime.NumCPU())
			fmt.Printf("  Target Domain : %s\n", claims.Domain)
			fmt.Printf("  Is B2G/Edu    : %t\n", claims.IsB2G)
			fmt.Printf("  Expires       : %s\n", time.Unix(claims.ExpiresAt, 0).Format("2006-01-02 15:04:05 MST"))
			fmt.Println("==================================================================")
			os.Exit(0)

		default:
			printLicenseHelp()
			os.Exit(1)
		}
	}
	return false
}

func printLicenseHelp() {
	fmt.Println("Usage: gateway license <generate|verify> [options]")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  generate  --domain=<domain> --cores=<cores> --tier=<tier> --years=<years> [--po=<code_po>]")
	fmt.Println("  verify    --key=<license_key> [--domain=<domain>]")
}
