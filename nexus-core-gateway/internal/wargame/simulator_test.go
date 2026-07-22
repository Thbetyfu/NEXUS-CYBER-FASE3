package wargame

import (
	"testing"
)

func TestWarGameSimulator(t *testing.T) {
	t.Run("Run All War Game Simulation Scenarios", func(t *testing.T) {
		results, err := RunSimulationScenario("all")
		if err != nil {
			t.Fatalf("Failed to run all simulation scenarios: %v", err)
		}

		if len(results) != 4 {
			t.Errorf("Expected 4 simulation results, got %d", len(results))
		}

		for _, res := range results {
			if res.SuccessRatePercent != 100.0 {
				t.Errorf("Scenario %s expected 100%% success rate, got %.1f%%", res.ScenarioID, res.SuccessRatePercent)
			}
		}
	})

	t.Run("Run Single SQLi Simulation Scenario", func(t *testing.T) {
		results, err := RunSimulationScenario("sqli")
		if err != nil {
			t.Fatalf("Failed to run sqli simulation scenario: %v", err)
		}

		if len(results) != 1 || results[0].ScenarioID != "sqli" {
			t.Errorf("Expected single sqli result, got %v", results)
		}
	})
}
