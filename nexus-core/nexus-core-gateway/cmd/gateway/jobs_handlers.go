package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/nexus-cyber/nexus-core-gateway/internal/database"
	"github.com/nexus-cyber/nexus-core-gateway/internal/models"
)

type coworkJobUpsertRequest struct {
	JobID          string         `json:"job_id"`
	Title          string         `json:"title"`
	TargetURL      string         `json:"target_url"`
	HostKey        string         `json:"host_key"`
	Scope          string         `json:"scope"`
	AutonomyLevel  string         `json:"autonomy_level"`
	Status         string         `json:"status"`
	ScanID         string         `json:"scan_id"`
	RepoPath       string         `json:"repo_path"`
	DefenseDeltas  map[string]int `json:"defense_deltas"`
	Residuals      []string       `json:"residuals"`
	AntibodyLoopOK *bool          `json:"antibody_loop_ok"`
	FindingsCount  int            `json:"findings_count"`
	MitigatedCount int            `json:"mitigated_count"`
	LiveChecksRun  int            `json:"live_checks_run"`
	StepLogs       []struct {
		Phase   string `json:"phase"`
		Message string `json:"message"`
		At      string `json:"at"`
	} `json:"step_logs"`
	Approvals []struct {
		Operator      string `json:"operator"`
		AutonomyLevel string `json:"autonomy_level"`
		Note          string `json:"note"`
		Approved      bool   `json:"approved"`
		At            string `json:"at"`
	} `json:"approvals"`
	ScanResultJSON string `json:"scan_result_json"`
	ArtifactJSON   string `json:"artifact_json"`
	ArtifactMD     string `json:"artifact_md"`
}

type coworkJobApproveRequest struct {
	Operator string                 `json:"operator"`
	Note     string                 `json:"note"`
	Approved bool                   `json:"approved"`
	Job      coworkJobUpsertRequest `json:"job"`
}

func jobsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		switch r.Method {
		case http.MethodGet:
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			jobs, total, err := database.ListCoworkJobs(limit, offset)
			if err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error(), "storage": "degraded"})
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"total":   total,
				"jobs":    jobs,
				"storage": "postgres",
			})
		case http.MethodPost:
			body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
			if err != nil {
				http.Error(w, `{"error":"read body"}`, http.StatusBadRequest)
				return
			}
			var req coworkJobUpsertRequest
			if err := json.Unmarshal(body, &req); err != nil {
				http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
				return
			}
			if err := persistCoworkJobRequest(req); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "job_id": req.JobID})
		default:
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		}
	}
}

func jobByIDHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		path := strings.TrimPrefix(r.URL.Path, "/api/jobs/")
		jobID := strings.TrimSuffix(path, "/approve")
		if jobID == "" || strings.Contains(jobID, "/") {
			http.Error(w, `{"error":"job_id required"}`, http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			job, err := database.GetCoworkJob(jobID)
			if err != nil {
				http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "job": job})
			return
		}
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func jobApproveHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		path := strings.TrimPrefix(r.URL.Path, "/api/jobs/")
		jobID := strings.TrimSuffix(path, "/approve")
		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			http.Error(w, `{"error":"read body"}`, http.StatusBadRequest)
			return
		}
		var req coworkJobApproveRequest
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
			return
		}
		if req.Job.JobID == "" {
			req.Job.JobID = jobID
		}
		now := time.Now().UTC()
		req.Job.Approvals = append(req.Job.Approvals, struct {
			Operator      string `json:"operator"`
			AutonomyLevel string `json:"autonomy_level"`
			Note          string `json:"note"`
			Approved      bool   `json:"approved"`
			At            string `json:"at"`
		}{
			Operator:      req.Operator,
			AutonomyLevel: req.Job.AutonomyLevel,
			Note:          req.Note,
			Approved:      req.Approved,
			At:            now.Format(time.RFC3339),
		})
		if err := persistCoworkJobRequest(req.Job); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		job, _ := database.GetCoworkJob(jobID)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "job": job})
	}
}

func hostImmuneHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		hostKey := r.URL.Query().Get("host")
		if hostKey == "" {
			http.Error(w, `{"error":"host query required"}`, http.StatusBadRequest)
			return
		}
		if r.Method == http.MethodGet {
			row, err := database.GetHostImmuneMemory(hostKey)
			if err != nil {
				http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "host": row})
			return
		}
		if r.Method == http.MethodPost {
			body, err := io.ReadAll(io.LimitReader(r.Body, 65536))
			if err != nil {
				http.Error(w, `{"error":"read body"}`, http.StatusBadRequest)
				return
			}
			var payload struct {
				HostKey     string `json:"host_key"`
				Learned     int    `json:"antibody_learned_count"`
				Missed      int    `json:"replay_missed_count"`
				OriginOpen  int    `json:"origin_open_count"`
				LastJobID   string `json:"last_job_id"`
				LastStatus  string `json:"last_status"`
				HistoryJSON string `json:"history_json"`
			}
			if err := json.Unmarshal(body, &payload); err != nil {
				http.Error(w, `{"error":"invalid json"}`, http.StatusBadRequest)
				return
			}
			if payload.HostKey == "" {
				payload.HostKey = hostKey
			}
			if err := database.UpsertHostImmuneMemory(
				payload.HostKey, payload.Learned, payload.Missed, payload.OriginOpen,
				payload.LastJobID, payload.LastStatus, payload.HistoryJSON,
			); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"success": true})
			return
		}
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

func persistCoworkJobRequest(req coworkJobUpsertRequest) error {
	dto := database.CoworkJobDTO{
		JobID:          req.JobID,
		Title:          req.Title,
		TargetURL:      req.TargetURL,
		HostKey:        req.HostKey,
		Scope:          req.Scope,
		AutonomyLevel:  req.AutonomyLevel,
		Status:         req.Status,
		ScanID:         req.ScanID,
		RepoPath:       req.RepoPath,
		DefenseDeltas:  req.DefenseDeltas,
		Residuals:      req.Residuals,
		AntibodyLoopOK: req.AntibodyLoopOK,
		FindingsCount:  req.FindingsCount,
		MitigatedCount: req.MitigatedCount,
		LiveChecksRun:  req.LiveChecksRun,
	}
	var steps []models.CoworkJobStepLog
	for _, item := range req.StepLogs {
		loggedAt := time.Now().UTC()
		if item.At != "" {
			if parsed, err := time.Parse(time.RFC3339, item.At); err == nil {
				loggedAt = parsed
			}
		}
		steps = append(steps, models.CoworkJobStepLog{
			Phase:    item.Phase,
			Message:  item.Message,
			LoggedAt: loggedAt,
		})
	}
	var approvals []models.CoworkJobApproval
	for _, item := range req.Approvals {
		approvedAt := time.Now().UTC()
		if item.At != "" {
			if parsed, err := time.Parse(time.RFC3339, item.At); err == nil {
				approvedAt = parsed
			}
		}
		approvals = append(approvals, models.CoworkJobApproval{
			Operator:      item.Operator,
			AutonomyLevel: item.AutonomyLevel,
			Note:          item.Note,
			Approved:      item.Approved,
			ApprovedAt:    approvedAt,
		})
	}
	if err := database.UpsertCoworkJob(dto, steps, approvals); err != nil {
		return err
	}
	if req.ScanResultJSON != "" {
		_ = database.SaveCoworkJobScanResult(req.JobID, req.ScanResultJSON)
	}
	if req.ArtifactJSON != "" || req.ArtifactMD != "" {
		_ = database.SaveCoworkJobArtifacts(req.JobID, req.ArtifactJSON, req.ArtifactMD)
	}
	return nil
}
