package ai

import (
	"testing"
)

func TestParseCognitiveResponse_Standard(t *testing.T) {
	rawJSON := `{
		"threat_verdict": "CONFIRMED_MALICIOUS",
		"attacker_intent": "SQL Injection attempt",
		"attack_vector": "SQL_INJECTION",
		"confidence": 0.95,
		"mitigation_actions": [
			{"action_type": "BLOCK_IP", "priority": "HIGH", "parameters": {}}
		],
		"forensic_summary": "User attempted UNION select to steal admin passwords."
	}`

	result, err := ParseCognitiveResponse(rawJSON)
	if err != nil {
		t.Fatalf("Failed to parse standard response: %v", err)
	}

	if result.ThreatVerdict != "CONFIRMED_MALICIOUS" {
		t.Errorf("Expected threat_verdict to be CONFIRMED_MALICIOUS, got %s", result.ThreatVerdict)
	}
	if result.Confidence != 0.95 {
		t.Errorf("Expected confidence to be 0.95, got %f", result.Confidence)
	}
	if len(result.MitigationActions) != 1 || result.MitigationActions[0].ActionType != "BLOCK_IP" {
		t.Errorf("Expected 1 BLOCK_IP action")
	}
}

func TestParseCognitiveResponse_LocalNexAi(t *testing.T) {
	rawJSON := `{
		"status": "MALICIOUS",
		"threat_score": 0.98,
		"attack_type": "ZERO_DAY_BYPASS",
		"reason": "Mendeteksi bypass WAF dengan double url encoding."
	}`

	result, err := ParseCognitiveResponse(rawJSON)
	if err != nil {
		t.Fatalf("Failed to parse local response: %v", err)
	}

	if result.ThreatVerdict != "CONFIRMED_MALICIOUS" {
		t.Errorf("Expected threat_verdict mapped to CONFIRMED_MALICIOUS, got %s", result.ThreatVerdict)
	}
	if result.Confidence != 0.98 {
		t.Errorf("Expected confidence mapped to 0.98, got %f", result.Confidence)
	}
	if result.AttackVector != "ZERO_DAY_BYPASS" {
		t.Errorf("Expected attack_vector mapped to ZERO_DAY_BYPASS, got %s", result.AttackVector)
	}
	if result.ForensicSummary != "Mendeteksi bypass WAF dengan double url encoding." {
		t.Errorf("Expected forensic_summary mapped to reason")
	}
	if len(result.MitigationActions) != 1 || result.MitigationActions[0].ActionType != "BLOCK_IP" {
		t.Errorf("Expected mapped BLOCK_IP action for local malicious result")
	}
}

func TestParseCognitiveResponse_LocalNexAiBenign(t *testing.T) {
	rawJSON := `{
		"status": "BENIGN",
		"threat_score": 0.05,
		"attack_type": "NONE",
		"reason": "Lalu lintas normal."
	}`

	result, err := ParseCognitiveResponse(rawJSON)
	if err != nil {
		t.Fatalf("Failed to parse local benign response: %v", err)
	}

	if result.ThreatVerdict != "FALSE_POSITIVE" {
		t.Errorf("Expected threat_verdict mapped to FALSE_POSITIVE, got %s", result.ThreatVerdict)
	}
	if len(result.MitigationActions) != 0 {
		t.Errorf("Expected no mitigation actions for benign result")
	}
}
