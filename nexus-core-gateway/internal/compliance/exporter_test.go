package compliance

import (
	"testing"
)

func TestComplianceExporter(t *testing.T) {
	t.Run("Evaluate ISO 27001 Compliance", func(t *testing.T) {
		report, err := EvaluateCompliance(FrameworkISO27001, "kemenkeu.go.id")
		if err != nil {
			t.Fatalf("Failed to evaluate compliance: %v", err)
		}

		if report.OverallScore != 100.0 {
			t.Errorf("Expected overall score 100.0, got %.1f", report.OverallScore)
		}

		md := ExportReportMarkdown(report)
		if len(md) == 0 {
			t.Error("ExportReportMarkdown returned empty string")
		}

		t.Logf("Generated Audit Report:\n%s", md)
	})

	t.Run("Evaluate UU PDP Compliance", func(t *testing.T) {
		report, err := EvaluateCompliance(FrameworkUUPDP, "bkn.go.id")
		if err != nil {
			t.Fatalf("Failed to evaluate compliance: %v", err)
		}

		if report.ComplianceGrade != "AAA (EXCELLENT)" {
			t.Errorf("Expected grade AAA (EXCELLENT), got %s", report.ComplianceGrade)
		}
	})
}
