package main

import (
	"flag"
	"fmt"
	"os"
	"strings"

	"github.com/nexus-cyber/nexus-core-gateway/internal/wargame"
)

// HandleSimCLI Subcommand handler untuk CLI `gateway sim ...`
func HandleSimCLI(args []string) bool {
	if len(args) == 0 {
		return false
	}

	subCmd := strings.ToLower(args[0])
	if subCmd == "sim" || subCmd == "simulate" {
		simFlags := flag.NewFlagSet("sim", flag.ExitOnError)
		scenarioType := simFlags.String("type", "all", "Scenario type (all, ddos, sqli, ransomware, credential_stuffing)")

		_ = simFlags.Parse(args[1:])

		results, err := wargame.RunSimulationScenario(*scenarioType)
		if err != nil {
			fmt.Printf("[FAIL] Error executing war game simulation: %v\n", err)
			os.Exit(1)
		}

		fmt.Println("==================================================================")
		fmt.Println("⚔️ NEXUS CYBER - WAR ROOM LIVE WAR GAME SIMULATION")
		fmt.Println("==================================================================")
		fmt.Printf("  Target Scenario    : %s\n", strings.ToUpper(*scenarioType))
		fmt.Printf("  Scenarios Evaluated: %d\n", len(results))
		fmt.Println("------------------------------------------------------------------")

		for i, res := range results {
			fmt.Printf("  [%d] %s\n", i+1, res.ScenarioName)
			fmt.Printf("       Total Attacks : %d\n", res.TotalAttacks)
			fmt.Printf("       Mitigated     : %d (%.1f%% Success Rate)\n", res.MitigatedCount, res.SuccessRatePercent)
			fmt.Printf("       Defense Layer : %s\n", res.DefenseLayer)
			fmt.Printf("       Avg Latency   : %.3f ms\n", res.AvgLatencyMs)
			fmt.Printf("       Recovery      : %s\n", res.AutoRecoveryStatus)
			fmt.Println("------------------------------------------------------------------")
		}
		fmt.Println("==================================================================")
		os.Exit(0)
	}
	return false
}

func printSimHelp() {
	fmt.Println("Usage: gateway sim --type=<all|ddos|sqli|ransomware|credential_stuffing>")
}
